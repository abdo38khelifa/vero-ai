const http = require("http");

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.OPENAI_API_KEY;

const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vero AI</title>
<style>
*{box-sizing:border-box}
body{
 margin:0;
 background:#030b18;
 color:#fff;
 font-family:Arial,sans-serif;
 height:100vh;
 display:flex;
 flex-direction:column
}
header{
 padding:18px;
 background:#06152b;
 border-bottom:1px solid #12365c;
 display:flex;
 align-items:center;
 justify-content:space-between
}
.logo{font-size:25px;font-weight:bold}
.logo span{color:#00d9ff}
.status{font-size:12px;color:#65dfff}
#chat{
 flex:1;
 overflow-y:auto;
 padding:18px;
 display:flex;
 flex-direction:column;
 gap:12px
}
.msg{
 max-width:85%;
 padding:13px 16px;
 border-radius:18px;
 line-height:1.6;
 white-space:pre-wrap
}
.user{
 align-self:flex-start;
 background:#075b91
}
.ai{
 align-self:flex-end;
 background:#10243c;
 border:1px solid #16466c
}
.bottom{
 padding:12px;
 background:#06152b;
 border-top:1px solid #12365c
}
.options{
 display:flex;
 justify-content:space-between;
 align-items:center;
 margin-bottom:9px;
 font-size:13px
}
.switch{
 display:flex;
 align-items:center;
 gap:8px
}
button{
 border:0;
 cursor:pointer
}
input[type=checkbox]{width:20px;height:20px}
.row{display:flex;gap:8px}
textarea{
 flex:1;
 resize:none;
 min-height:50px;
 max-height:130px;
 padding:13px;
 border-radius:15px;
 border:1px solid #1b527e;
 background:#081b31;
 color:#fff;
 outline:none;
 font-size:15px
}
.send{
 width:58px;
 border-radius:15px;
 background:#00bde9;
 color:#00131d;
 font-weight:bold;
 font-size:20px
}
.clear{
 background:#10243c;
 color:#fff;
 padding:7px 12px;
 border-radius:10px
}
</style>
</head>
<body>

<header>
 <div class="logo">🧠 Vero <span>AI</span></div>
 <div class="status">● Online</div>
</header>

<div id="chat">
 <div class="msg ai">أهلًا بك في Vero AI 👋
أنا جاهز للدردشة معك.</div>
</div>

<div class="bottom">
 <div class="options">
   <label class="switch">
     <input id="nwfs" type="checkbox">
     <span>NWFS</span>
   </label>
   <button class="clear" onclick="clearChat()">مسح المحادثة</button>
 </div>

 <div class="row">
   <textarea id="input" placeholder="اكتب رسالتك هنا..."></textarea>
   <button class="send" onclick="sendMessage()">➤</button>
 </div>
</div>

<script>
const chat = document.getElementById("chat");
const input = document.getElementById("input");
const nwfs = document.getElementById("nwfs");

let history = [];

function addMessage(text,type){
 const div=document.createElement("div");
 div.className="msg "+type;
 div.textContent=text;
 chat.appendChild(div);
 chat.scrollTop=chat.scrollHeight;
}

async function sendMessage(){
 const text=input.value.trim();
 if(!text)return;

 input.value="";
 addMessage(text,"user");

 history.push({role:"user",content:text});

 const thinking=document.createElement("div");
 thinking.className="msg ai";
 thinking.textContent="Vero AI يفكر...";
 chat.appendChild(thinking);
 chat.scrollTop=chat.scrollHeight;

 try{
   const response=await fetch("/api/chat",{
     method:"POST",
     headers:{"Content-Type":"application/json"},
     body:JSON.stringify({
       messages:history,
       nwfs:nwfs.checked
     })
   });

   const data=await response.json();
   thinking.remove();

   if(!response.ok){
     addMessage(data.error || "حدث خطأ.","ai");
     return;
   }

   addMessage(data.reply,"ai");
   history.push({role:"assistant",content:data.reply});

 }catch(e){
   thinking.remove();
   addMessage("تعذر الاتصال بالخادم.","ai");
 }
}

input.addEventListener("keydown",e=>{
 if(e.key==="Enter" && !e.shiftKey){
   e.preventDefault();
   sendMessage();
 }
});

function clearChat(){
 history=[];
 chat.innerHTML="";
 addMessage("تم مسح المحادثة. كيف يمكنني مساعدتك؟","ai");
}
</script>

</body>
</html>`;

const server = http.createServer(async (req, res) => {

  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, {"Content-Type":"text/html; charset=utf-8"});
    res.end(html);
    return;
  }

  if (req.method === "POST" && req.url === "/api/chat") {

    if (!API_KEY) {
      res.writeHead(500, {"Content-Type":"application/json"});
      res.end(JSON.stringify({
        error:"لم يتم وضع OPENAI_API_KEY في إعدادات الخادم بعد."
      }));
      return;
    }

    let body="";

    req.on("data",chunk=>{
      body+=chunk;
    });

    req.on("end",async()=>{

      try{
        const data=JSON.parse(body);

        let instructions =
          "You are Vero AI, a helpful AI assistant. Answer clearly and naturally.";

        if(data.nwfs){
          instructions +=
            " The user enabled the NWFS preference. Do not treat this preference as permission to violate the model provider's safety policies.";
        }

        const apiResponse=await fetch(
          "https://api.openai.com/v1/responses",
          {
            method:"POST",
            headers:{
              "Content-Type":"application/json",
              "Authorization":"Bearer "+API_KEY
            },
            body:JSON.stringify({
              model:"gpt-5.6",
              instructions:instructions,
              input:data.messages || []
            })
          }
        );

        const result=await apiResponse.json();

        if(!apiResponse.ok){
          res.writeHead(apiResponse.status,{
            "Content-Type":"application/json"
          });
          res.end(JSON.stringify({
            error:result.error?.message || "OpenAI API error"
          }));
          return;
        }

        res.writeHead(200,{
          "Content-Type":"application/json"
        });

        res.end(JSON.stringify({
          reply:result.output_text || "لم يصل رد من النموذج."
        }));

      }catch(error){

        res.writeHead(500,{
          "Content-Type":"application/json"
        });

        res.end(JSON.stringify({
          error:"حدث خطأ في الخادم."
        }));
      }

    });

    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT,()=>{
 console.log("Vero AI running on port "+PORT);
});
