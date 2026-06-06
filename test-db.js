import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const processEnv = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    processEnv[key] = val;
  }
});

const supabase = createClient(
  processEnv.VITE_SUPABASE_URL,
  processEnv.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('materials')
    .select('title, description, file_url, file_type, content')
    .limit(10);
  
  if (error) {
    console.error('Error fetching materials:', error);
  } else {
    console.log('Materials in DB:');
    data.forEach(m => {
      console.log(`- Title: ${m.title}`);
      console.log(`  Description: ${m.description}`);
      console.log(`  File URL: ${m.file_url}`);
      console.log(`  Type: ${m.file_type}`);
      console.log(`  Content length: ${m.content ? m.content.length : 0} chars`);
      if (m.content) {
        console.log(`  Content snippet: "${m.content.substring(0, 150)}..."`);
      }
      console.log('---');
    });
  }
}

check();
