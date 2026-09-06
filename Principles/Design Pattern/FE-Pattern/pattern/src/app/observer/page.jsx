// src/app/observer-pattern/page.jsx
"use client";
import { useState, useEffect } from "react";
import eventBus from "./eventBus";

function Publisher() {
  const sendMessage = () => {
    eventBus.emit("message", "Hello from Publisher!");
  };

  return (
    <div>
      <button className=" bg-green-600" onClick={sendMessage}>Send Message</button>
    </div>
  );
}

function Subscriber() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = eventBus.subscribe("message", (data) => {
      setMessage(data);
    });

    return () => unsubscribe(); // Cleanup on unmount
  }, []);

  return <div>Received Message: {message}</div>;
}

export default function ObserverPatternPage() {
  return (
    <div style={{ padding: 20 }}>
      <h1>Observer Pattern Example — Event Bus</h1>
      <Publisher />
      <Subscriber />
    </div>
  );
}

/* What happens here?
  EventBus is the Subject that manages a list of observers (listeners).
  Publisher emits an event with some data.
  Subscriber subscribes to that event and updates its UI when notified.
  Multiple subscribers can listen and react independently.
*/
