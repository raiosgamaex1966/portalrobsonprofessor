import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

// Helpers to map queries and entities between legacy format (created_date) and Supabase (created_at)
const mapOrder = (order) => {
  if (typeof order !== 'string') return order;
  if (order === '-created_date') return '-created_at';
  if (order === 'created_date') return 'created_at';
  return order;
};

const mapPayload = (payload) => {
  if (!payload || typeof payload !== 'object') return payload;
  const copy = { ...payload };
  delete copy.created_date;
  delete copy.created_at;
  delete copy.updated_at;
  delete copy.id;
  return copy;
};

const mapItem = (item) => {
  if (!item || typeof item !== 'object') return item;
  if (item.created_at && !item.created_date) {
    item.created_date = item.created_at;
  }
  return item;
};

const mapResult = (result) => {
  if (!result) return result;
  if (Array.isArray(result)) {
    return result.map(mapItem);
  }
  return mapItem(result);
};

// Adaptador de API — mapeia chamadas do padrão antigo para o Supabase
// Isso evita alterar cada página do projeto individualmente.

export const base44 = {
  auth: {
    me: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Tenta obter o nome completo da tabela 'profiles' para ser o nome oficial
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();

        const name = profile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0];
        const role = profile?.role || user.user_metadata?.role || 'user';

        return {
          id: user.id,
          email: user.email,
          role,
          name,
          full_name: name
        };
      }
      return null;
    },
    isAuthenticated: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    },
    logout: async () => {
      await supabase.auth.signOut();
      window.location.href = '/';
    },
    redirectToLogin: () => {
      window.location.href = '/';
    }
  },

  // Generic entity mapping
  entities: new Proxy({}, {
    get: (target, entityName) => {
      // Special case for User management using supabaseAdmin
      if (entityName === 'User') {
        return {
          list: async () => {
            // Use supabaseAdmin to bypass RLS and fetch ALL profiles
            const profilesClient = supabaseAdmin || supabase;
            const { data: profiles } = await profilesClient.from('profiles').select('id, full_name, role');
            const profileMap = {};
            (profiles || []).forEach(p => {
              profileMap[p.id] = p;
            });

            if (supabaseAdmin) {
              const { data, error } = await supabaseAdmin.auth.admin.listUsers();
              if (error) throw error;
              return data.users.map(u => {
                const p = profileMap[u.id];
                return {
                  id: u.id,
                  email: u.email,
                  full_name: p?.full_name || u.user_metadata?.full_name || u.email.split('@')[0],
                  role: p?.role || u.user_metadata?.role || 'user',
                  created_date: u.created_at
                };
              });
            }
            // Fallback to profiles table if no admin permissions
            const { data, error } = await supabase.from('profiles').select('*');
            if (error) throw error;
            return data.map(p => ({
              id: p.id,
              email: '(sem email)',
              full_name: p.full_name || '',
              role: p.role || 'user',
              created_date: p.created_at
            }));
          },
          filter: async (filters) => {
            // Use supabaseAdmin to bypass RLS and fetch ALL profiles
            const profilesClient = supabaseAdmin || supabase;
            const { data: profiles } = await profilesClient.from('profiles').select('id, full_name, role');
            const profileMap = {};
            (profiles || []).forEach(p => {
              profileMap[p.id] = p;
            });

            if (supabaseAdmin) {
              const { data, error } = await supabaseAdmin.auth.admin.listUsers();
              if (error) throw error;
              let result = data.users.map(u => {
                const p = profileMap[u.id];
                return {
                  id: u.id,
                  email: u.email,
                  full_name: p?.full_name || u.user_metadata?.full_name || u.email.split('@')[0],
                  role: p?.role || u.user_metadata?.role || 'user',
                  created_date: u.created_at
                };
              });
              Object.entries(filters).forEach(([key, value]) => {
                result = result.filter(u => u[key] === value);
              });
              return result;
            }
            return [];
          },
          delete: async (id) => {
            if (supabaseAdmin) {
              const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
              if (error) throw error;
              return true;
            }
            throw new Error('Supabase Service Role Key não configurada.');
          }
        };
      }

      if (entityName === 'ChatRoom') {
        return {
          list: async (order = '-created_at') => {
            order = mapOrder(order);
            const { data, error } = await supabase
              .from('chat_rooms')
              .select('*')
              .order(order.startsWith('-') ? order.substring(1) : order, { ascending: !order.startsWith('-') });
            if (error) throw error;

            const userIds = [...new Set((data || []).filter(item => !item.is_group).map(item => item.user_id))];
            const profileMap = {};
            if (userIds.length > 0) {
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);
              (profiles || []).forEach(p => {
                profileMap[p.id] = p;
              });
            }

            return (data || []).map(item => {
              const [titleName, titleEmail] = (item.title || '').split('|');
              const profile = profileMap[item.user_id];
              const name = item.is_group ? item.title : (profile?.full_name || titleName || 'Aluno');
              const email = item.is_group ? 'Grupo' : (profile?.email || titleEmail || '');
              return {
                ...item,
                student_id: item.user_id,
                student_name: name,
                student_email: email,
                last_message: item.is_group ? `Grupo: ${item.title}` : (name ? `Conversa com ${name}` : 'Nova conversa'),
                last_message_at: item.last_message_at || item.created_at,
                created_date: item.created_at
              };
            });
          },
          filter: async (filters, order = '-created_at') => {
            order = mapOrder(order);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return [];
            
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            const isAdmin = profile?.role === 'admin';
            
            let query = supabase.from('chat_rooms').select('*');
            
            if (!isAdmin) {
              const { data: memberships } = await supabase.from('chat_room_members').select('room_id').eq('user_id', user.id);
              const roomIds = (memberships || []).map(m => m.room_id);
              
              const idsCondition = roomIds.length > 0 ? `,id.in.(${roomIds.join(',')})` : '';
              query = query.or(`user_id.eq.${user.id}${idsCondition}`);
            } else {
              if (filters.student_email) {
                query = query.like('title', `%|${filters.student_email}`);
              }
            }
            
            const { data, error } = await query.order(order.startsWith('-') ? order.substring(1) : order, { ascending: !order.startsWith('-') });
            if (error) throw error;

            const userIds = [...new Set((data || []).filter(item => !item.is_group).map(item => item.user_id))];
            const profileMap = {};
            if (userIds.length > 0) {
              const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name')
                .in('id', userIds);
              (profiles || []).forEach(p => {
                profileMap[p.id] = p;
              });
            }

            return (data || []).map(item => {
              const [titleName, titleEmail] = (item.title || '').split('|');
              const profile = profileMap[item.user_id];
              const name = item.is_group ? item.title : (profile?.full_name || titleName || 'Aluno');
              const email = item.is_group ? 'Grupo' : (profile?.email || titleEmail || '');
              return {
                ...item,
                student_id: item.user_id,
                student_name: name,
                student_email: email,
                last_message: item.is_group ? `Grupo: ${item.title}` : (name ? `Conversa com ${name}` : 'Nova conversa'),
                last_message_at: item.last_message_at || item.created_at,
                created_date: item.created_at
              };
            });
          },
          get: async (id) => {
            const { data, error } = await supabase.from('chat_rooms').select('*').eq('id', id).single();
            if (error) throw error;

            let name = 'Aluno';
            let email = '';
            
            if (!data.is_group) {
              const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', data.user_id).single();
              const [titleName, titleEmail] = (data.title || '').split('|');
              name = profile?.full_name || titleName || 'Aluno';
              email = titleEmail || '';
            } else {
              name = data.title;
              email = 'Grupo';
            }

            return {
              ...data,
              student_id: data.user_id,
              student_name: name,
              student_email: email,
              last_message: data.is_group ? `Grupo: ${data.title}` : (name ? `Conversa com ${name}` : 'Nova conversa'),
              last_message_at: data.last_message_at || data.created_at,
              created_date: data.created_at
            };
          },
          create: async (payload) => {
            const { data: { user } } = await supabase.auth.getUser();
            let dbPayload = {};
            let studentName = payload.student_name;
            let studentEmail = payload.student_email;
            
            if (payload.is_group) {
              dbPayload = {
                title: payload.title || 'Novo Grupo',
                is_group: true,
                user_id: user?.id
              };
            } else {
              if ((!studentName || !studentEmail) && user) {
                const targetUserId = payload.student_id || user.id;
                const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', targetUserId).single();
                if (!studentName) studentName = profile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0];
                if (!studentEmail) studentEmail = user.email || '';
              }
              
              if (!studentName) studentName = 'Aluno';
              if (!studentEmail) studentEmail = '';
              
              dbPayload = {
                user_id: payload.student_id || user?.id,
                title: `${studentName}|${studentEmail}`,
                is_group: false,
                last_message_at: payload.last_message_at || new Date().toISOString()
              };
            }
            
            const { data, error } = await supabase.from('chat_rooms').insert(dbPayload).select().single();
            if (error) throw error;
            
            const [titleName, titleEmail] = (data.title || '').split('|');
            const name = data.is_group ? data.title : (studentName || titleName || 'Aluno');
            const email = data.is_group ? 'Grupo' : (studentEmail || titleEmail || '');
            
            return {
              ...data,
              student_id: data.user_id,
              student_name: name,
              student_email: email,
              last_message: name ? (data.is_group ? data.title : `Conversa com ${name}`) : 'Nova conversa',
              last_message_at: data.last_message_at || data.created_at,
              created_date: data.created_at
            };
          },
          update: async (id, payload) => {
            const dbPayload = {};
            if (payload.last_message_at) dbPayload.last_message_at = payload.last_message_at;
            const { data, error } = await supabase.from('chat_rooms').update(dbPayload).eq('id', id).select().single();
            if (error) throw error;

            let name = 'Aluno';
            let email = '';
            
            if (!data.is_group) {
              const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', data.user_id).single();
              const [titleName, titleEmail] = (data.title || '').split('|');
              name = profile?.full_name || titleName || 'Aluno';
              email = titleEmail || '';
            } else {
              name = data.title;
              email = 'Grupo';
            }

            return {
              ...data,
              student_id: data.user_id,
              student_name: name,
              student_email: email,
              last_message: data.is_group ? `Grupo: ${data.title}` : (name ? `Conversa com ${name}` : 'Nova conversa'),
              last_message_at: data.last_message_at || data.created_at,
              created_date: data.created_at
            };
          },
          delete: async (id) => {
            const { error } = await supabase.from('chat_rooms').delete().eq('id', id);
            if (error) throw error;
            return true;
          }
        };
      }

      if (entityName === 'ChatMessage') {
        return {
          filter: async (filters, order = 'created_at') => {
            order = mapOrder(order);
            let query = supabase.from('chat_messages').select('*');
            if (filters.room_id) {
              query = query.eq('room_id', filters.room_id);
            }
            const { data, error } = await query.order(order.startsWith('-') ? order.substring(1) : order, { ascending: !order.startsWith('-') });
            if (error) throw error;

            const { data: profiles } = await supabase.from('profiles').select('id, full_name');
            const profileMap = {};
            (profiles || []).forEach(p => {
              profileMap[p.id] = p.full_name;
            });

            return (data || []).map(item => {
              const isUser = item.role === 'user';
              const name = profileMap[item.sender_id] || (isUser ? 'Aluno' : 'Professor');
              return {
                id: item.id,
                room_id: item.room_id,
                sender_id: item.sender_id,
                sender_name: name,
                sender_role: isUser ? 'student' : 'teacher',
                message: item.content,
                created_date: item.created_at
              };
            });
          },
          create: async (payload) => {
            const dbPayload = {
              room_id: payload.room_id,
              sender_id: payload.sender_id,
              role: payload.sender_role === 'student' ? 'user' : 'assistant',
              content: payload.message
            };
            const { data, error } = await supabase.from('chat_messages').insert(dbPayload).select().single();
            if (error) throw error;
            
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', data.sender_id).single();
            const isUser = data.role === 'user';
            const name = profile?.full_name || (isUser ? 'Aluno' : 'Professor');

            return {
              id: data.id,
              room_id: data.room_id,
              sender_id: data.sender_id,
              sender_name: name,
              sender_role: isUser ? 'student' : 'teacher',
              message: data.content,
              created_date: data.created_at
            };
          },
          subscribe: (callback) => {
            const channel = supabase
              .channel('schema-db-changes')
              .on(
                'postgres_changes',
                {
                  event: 'INSERT',
                  schema: 'public',
                  table: 'chat_messages'
                },
                async (payload) => {
                  const item = payload.new;
                  const isUser = item.role === 'user';
                  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', item.sender_id).single();
                  const name = profile?.full_name || (isUser ? 'Aluno' : 'Professor');
                  const mappedData = {
                    id: item.id,
                    room_id: item.room_id,
                    sender_id: item.sender_id,
                    sender_name: name,
                    sender_role: isUser ? 'student' : 'teacher',
                    message: item.content,
                    created_date: item.created_at
                  };
                  callback({ type: 'create', data: mappedData });
                }
              )
              .subscribe();

            return () => {
              supabase.removeChannel(channel);
            };
          }
        };
      }
      if (entityName === 'ClassStudent') {
        return {
          list: async (order = '-created_at') => {
            order = mapOrder(order);
            const { data, error } = await supabase
              .from('class_students')
              .select('*')
              .order(order.startsWith('-') ? order.substring(1) : order, { ascending: !order.startsWith('-') });
            if (error) throw error;

            const userIds = [...new Set((data || []).map(item => item.user_id))];
            const profileMap = {};
            if (userIds.length > 0) {
              const profilesClient = supabaseAdmin || supabase;
              const { data: profiles } = await profilesClient
                .from('profiles')
                .select('id, full_name, role')
                .in('id', userIds);
              (profiles || []).forEach(p => {
                profileMap[p.id] = p;
              });
            }

            return (data || []).map(item => {
              const profile = profileMap[item.user_id];
              return {
                ...item,
                student_name: profile?.full_name || item.student_name || item.student_email?.split('@')[0] || 'Aluno',
                created_date: item.created_at
              };
            });
          },
          filter: async (filters, order = '-created_at') => {
            order = mapOrder(order);
            let query = supabase.from('class_students').select('*');
            Object.entries(filters).forEach(([key, value]) => {
              query = query.eq(key, value);
            });
            const { data, error } = await query.order(order.startsWith('-') ? order.substring(1) : order, { ascending: !order.startsWith('-') });
            if (error) throw error;

            const userIds = [...new Set((data || []).map(item => item.user_id))];
            const profileMap = {};
            if (userIds.length > 0) {
              const profilesClient = supabaseAdmin || supabase;
              const { data: profiles } = await profilesClient
                .from('profiles')
                .select('id, full_name, role')
                .in('id', userIds);
              (profiles || []).forEach(p => {
                profileMap[p.id] = p;
              });
            }

            return (data || []).map(item => {
              const profile = profileMap[item.user_id];
              return {
                ...item,
                student_name: profile?.full_name || item.student_name || item.student_email?.split('@')[0] || 'Aluno',
                created_date: item.created_at
              };
            });
          },
          get: async (id) => {
            const { data, error } = await supabase.from('class_students').select('*').eq('id', id).single();
            if (error) throw error;
            const profilesClient = supabaseAdmin || supabase;
            const { data: profile } = await profilesClient.from('profiles').select('full_name').eq('id', data.user_id).single();
            return {
              ...data,
              student_name: profile?.full_name || data.student_name || data.student_email?.split('@')[0] || 'Aluno',
              created_date: data.created_at
            };
          },
          create: async (payload) => {
            const mappedPayload = mapPayload(payload);
            const { data, error } = await supabase.from('class_students').insert(mappedPayload).select().single();
            if (error) throw error;
            const profilesClient = supabaseAdmin || supabase;
            const { data: profile } = await profilesClient.from('profiles').select('full_name').eq('id', data.user_id).single();
            return {
              ...data,
              student_name: profile?.full_name || data.student_name || data.student_email?.split('@')[0] || 'Aluno',
              created_date: data.created_at
            };
          },
          update: async (id, payload) => {
            const mappedPayload = mapPayload(payload);
            const { data, error } = await supabase.from('class_students').update(mappedPayload).eq('id', id).select().single();
            if (error) throw error;
            const profilesClient = supabaseAdmin || supabase;
            const { data: profile } = await profilesClient.from('profiles').select('full_name').eq('id', data.user_id).single();
            return {
              ...data,
              student_name: profile?.full_name || data.student_name || data.student_email?.split('@')[0] || 'Aluno',
              created_date: data.created_at
            };
          },
          delete: async (id) => {
            const { error } = await supabase.from('class_students').delete().eq('id', id);
            if (error) throw error;
            return true;
          }
        };
      }

      // Map entity names to table names (snake_case)
      let tableName = entityName.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
      
      // Pluralization mapping for tables that use plural names in the database
      const pluralMappings = {
        'activity': 'activities',
        'discipline': 'disciplines',
        'material': 'materials',
        'chat_room': 'chat_rooms',
        'chat_message': 'chat_messages',
        'chat_room_member': 'chat_room_members',
        'class': 'classes',
        'class_student': 'class_students',
        'test': 'tests',
        'test_submission': 'test_submissions',
        'forum_topic': 'forum_topics',
        'forum_reply': 'forum_replies',
        'topic_follow': 'topic_follows',
        'student_badge': 'student_badges',
        'badge': 'badges',
        'video_resource': 'video_resources',
        'announcement': 'announcements',
        'announcement_view': 'announcement_views',
        'student_notification': 'student_notifications',
        'student_message': 'student_messages',
        'activity_submission': 'activity_submissions',
        'practical_submission': 'practical_submissions',
        'discipline_class': 'discipline_classes'
      };
      
      if (pluralMappings[tableName]) {
        tableName = pluralMappings[tableName];
      }
      
      return {
        list: async (order = '-created_at') => {
          order = mapOrder(order);
          let query = supabase.from(tableName).select('*');
          if (order.startsWith('-')) {
            query = query.order(order.substring(1), { ascending: false });
          } else {
            query = query.order(order, { ascending: true });
          }
          const { data, error } = await query;
          if (error) throw error;
          return mapResult(data || []);
        },
        filter: async (filters, order = '-created_at') => {
          order = mapOrder(order);
          // Map created_date in filters if present
          const mappedFilters = {};
          Object.entries(filters).forEach(([key, value]) => {
            const mappedKey = key === 'created_date' ? 'created_at' : key;
            mappedFilters[mappedKey] = value;
          });

          let query = supabase.from(tableName).select('*');
          Object.entries(mappedFilters).forEach(([key, value]) => {
            query = query.eq(key, value);
          });
          if (order.startsWith('-')) {
            query = query.order(order.substring(1), { ascending: false });
          } else {
            query = query.order(order, { ascending: true });
          }
          const { data, error } = await query;
          if (error) throw error;
          return mapResult(data || []);
        },
        get: async (id) => {
          const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
          if (error) throw error;
          return mapResult(data);
        },
        create: async (payload) => {
          const mappedPayload = mapPayload(payload);
          const { data, error } = await supabase.from(tableName).insert(mappedPayload).select().single();
          if (error) throw error;
          return mapResult(data);
        },
        update: async (id, payload) => {
          const mappedPayload = mapPayload(payload);
          const { data, error } = await supabase.from(tableName).update(mappedPayload).eq('id', id).select().single();
          if (error) throw error;
          return mapResult(data);
        },
        delete: async (id) => {
          const { error } = await supabase.from(tableName).delete().eq('id', id);
          if (error) throw error;
          return true;
        }
      };
    }
  }),

  // Users management
  users: {
    inviteUser: async (email, role) => {
      if (supabaseAdmin) {
        // Gera uma senha temporária segura
        const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
        
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { role, full_name: email.split('@')[0] }
        });
        
        if (error) {
          if (error.message.includes('already exists') || error.message.includes('email_exists')) {
            return { email, password: null, alreadyExists: true };
          }
          throw error;
        }
        
        return { email, password: tempPassword };
      }
      throw new Error('Supabase Service Role Key não configurada.');
    },
    resetPassword: async (email) => {
      if (supabaseAdmin) {
        const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) throw listError;
        
        const targetUser = data.users.find(u => u.email === email);
        if (!targetUser) throw new Error('Usuário não encontrado.');
        
        const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
          password: tempPassword
        });
        if (updateError) throw updateError;
        
        return { email, password: tempPassword };
      }
      throw new Error('Supabase Service Role Key não configurada.');
    }
  },

  // Mock functions backend emulated client-side
  functions: {
    invoke: async (name, payload) => {
      if (name === 'sendPreInvite') {
        const { email, role } = payload;
        const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
        
        // Empacota e encoda como base64
        const tokenObj = { email, password: tempPassword, role };
        const token = btoa(JSON.stringify(tokenObj));
        
        const inviteUrl = `${window.location.origin}/AcceptInvite?token=${token}`;
        return {
          data: {
            success: true,
            inviteUrl,
            email,
            password: tempPassword
          }
        };
      }
      
      if (name === 'createUserWithPassword') {
        const { token } = payload;
        if (!token) throw new Error('Token inválido');
        
        try {
          const decoded = JSON.parse(atob(token));
          const { email, password, role } = decoded;
          
          if (!supabaseAdmin) {
            throw new Error('Supabase Service Role Key não configurada.');
          }
          
          const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role, full_name: email.split('@')[0] }
          });
          
          if (error) {
            if (error.message.includes('already exists') || error.message.includes('email_exists')) {
              return {
                data: {
                  email,
                  password: '(Já cadastrado)',
                  error: null
                }
              };
            }
            throw error;
          }
          
          return {
            data: {
              email,
              password,
              error: null
            }
          };
        } catch (e) {
          throw new Error('Falha ao processar token de convite: ' + e.message);
        }
      }
      
      throw new Error(`Função ${name} não suportada.`);
    }
  },

  // Integrations mapping
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        const { data, error } = await supabase.storage
          .from('app_data')
          .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('app_data')
          .getPublicUrl(filePath);

        return { file_url: publicUrl };
      }
    }
  },

  // Storage helper
  storage: {
    getPublicUrl: (path) => {
      const { data: { publicUrl } } = supabase.storage.from('app_data').getPublicUrl(path);
      return publicUrl;
    }
  },

  appLogs: {
    logUserInApp: async () => {} // Optional: implement with a logs table
  }
};
