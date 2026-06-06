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
        return {
          id: user.id,
          email: user.email,
          role: user.user_metadata?.role || 'user',
          name: user.user_metadata?.full_name || user.email.split('@')[0],
          full_name: user.user_metadata?.full_name || user.email.split('@')[0]
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
            if (supabaseAdmin) {
              const { data, error } = await supabaseAdmin.auth.admin.listUsers();
              if (error) throw error;
              return data.users.map(u => ({
                id: u.id,
                email: u.email,
                full_name: u.user_metadata?.full_name || u.email.split('@')[0],
                role: u.user_metadata?.role || 'user',
                created_date: u.created_at
              }));
            }
            // Fallback to profiles table if no admin permissions
            const { data, error } = await supabase.from('profiles').select('*');
            if (error) throw error;
            return data.map(p => ({
              id: p.id,
              email: p.email || '(sem email)',
              full_name: p.full_name || '',
              role: p.role || 'user',
              created_date: p.created_at
            }));
          },
          filter: async (filters) => {
            if (supabaseAdmin) {
              const { data, error } = await supabaseAdmin.auth.admin.listUsers();
              if (error) throw error;
              let result = data.users.map(u => ({
                id: u.id,
                email: u.email,
                full_name: u.user_metadata?.full_name || u.email.split('@')[0],
                role: u.user_metadata?.role || 'user',
                created_date: u.created_at
              }));
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

      // Map entity names to table names (snake_case)
      let tableName = entityName.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
      
      // Pluralization mapping for tables that use plural names in the database
      const pluralMappings = {
        'activity': 'activities',
        'discipline': 'disciplines',
        'material': 'materials',
        'chat_room': 'chat_rooms',
        'chat_message': 'chat_messages',
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
