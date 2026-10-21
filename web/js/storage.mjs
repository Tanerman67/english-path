import {DB_NAME,DB_VERSION} from './engine.mjs';
const TABLE='entries';
let dbPromise;
function open(){
  if(!dbPromise) dbPromise=new Promise((resolve,reject)=>{
    if(!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable in this browser'));
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(TABLE)) db.createObjectStore(TABLE,{keyPath:'key'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error??new Error('Failed to open IndexedDB'));
    req.onblocked=()=>reject(new Error('Database is blocked by another tab'));
  });
  return dbPromise;
}
function txn(mode,callback){
  return open().then(db=>new Promise((resolve,reject)=>{
    const tx=db.transaction(TABLE,mode),store=tx.objectStore(TABLE);
    let result;
    try{result=callback(store);}catch(err){tx.abort();return reject(err);}
    tx.oncomplete=()=>resolve(result);
    tx.onerror=()=>reject(tx.error??new Error('Database transaction failed'));
    tx.onabort=()=>reject(tx.error??new Error('Database transaction aborted'));
  }));
}
export async function readAll(){
  const db=await open();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(TABLE,'readonly');
    const req=tx.objectStore(TABLE).getAll();
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error??new Error('Reading progress failed'));
  });
}
export async function putRecord(record){return txn('readwrite',store=>{store.put(record);});}
export async function putRecords(records){return txn('readwrite',store=>{for(const record of records)store.put(record);});}
