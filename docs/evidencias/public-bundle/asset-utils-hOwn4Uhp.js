async function o(r){return new Promise((a,n)=>{const e=new FileReader;e.onload=()=>a(e.result),e.onerror=n,e.readAsDataURL(r)})}export{o as f};
