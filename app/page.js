import Image from "next/image";
import styles from "./page.module.css";

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm the Rate My Professor support assistant. How can I help you today?"
    }

  ])
  const [message, setMessage] = useState('')
  const sendMessage = async () => {
    setMessage((message)=>[
      ...messages,
      {role: 'user', content: message},
      {role: 'assistant', content: ''}
    ])
    setMessage('')
    const response = fetch('api/chat', {
      method: "POST",
      header: {
        'Content-Type:': 'application/json'
      },
      body: JSON.stringify([...messages, {role: 'user', content: message}])
    }).then(async(res)=>{
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      let result = ''
      return reader.read().then(function processText({done, value}){
        if(done){
          return result
        }
        const text = decoder.decode(value || new Uint8Array(), {stream: true})
      setMessage((messages)=>{
        let lastMessage = messages[message.length -1]
        let otherMessages = messages.slice(0, message.length - 1)
      })
      })
    })
  }
  return ()
}
