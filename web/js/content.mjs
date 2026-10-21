import {validateContent} from './engine.mjs';
export async function loadLessons(){
  const manifest=await (await fetch('./content/manifest.json',{cache:'no-cache'})).json();
  if(!Array.isArray(manifest.lessons)) throw new Error('Missing content manifest');
  const lessons=await Promise.all(manifest.lessons.map(async id=>{
    const res=await fetch(`./content/lessons/${id}.json`);
    if(!res.ok) throw new Error(`Could not load lesson ${id}`);
    return res.json();
  }));
  lessons.sort((a,b)=>a.order-b.order);
  validateContent(lessons);
  return lessons;
}
