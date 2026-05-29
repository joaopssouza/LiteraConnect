const fs = require('fs');
const path = require('path');
const files = [
  'app/post/page.tsx', 
  'app/profile/page.tsx', 
  'app/profile/[handle]/page.tsx', 
  'app/post/[id]/page.tsx', 
  'app/page.tsx', 
  'app/post/edit/[id]/page.tsx', 
  'app/post/drafts/page.tsx', 
  'app/login/page.tsx', 
  'app/explore/page.tsx', 
  'app/editor/page.tsx', 
  'app/chat/page.tsx', 
  'app/activity/page.tsx'
];
files.forEach(f => { 
  const p = path.join('c:/PROJETOS/senai_projeto_leitura', f); 
  if (fs.existsSync(p)) {
      let c = fs.readFileSync(p, 'utf8'); 
      if(!c.startsWith("'use client';")) { 
        fs.writeFileSync(p, "'use client';\n\n" + c); 
        console.log(`Updated ${f}`);
      } 
  }
}); 
console.log('Done');
