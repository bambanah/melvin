import axios from 'axios';
import React, { useState, useEffect } from 'react';

function App() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    axios.get("http://localhost:3001").then((res) => {
      setMessage(res.data.message);
    });
  });

  return (
    <div className="App">
      <h2>{message}</h2>
      <p>mess</p>
    </div>
  );
}

export default App;
