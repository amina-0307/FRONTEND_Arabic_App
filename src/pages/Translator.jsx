import { useState } from "react";
import axios from "axios";

function Translator() {
    const [input , setInput] = useState("");
    const [result, setResult] = useState("");

    const handleTranslate = async () => {
        try {
            const res = await axios.post(import.meta.env.VITE_API_URL, {text: input });
            setResult(res.data.result);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div>
            <h2>Translator</h2>
            <input value={input} onChange={(e) => setInput(e.target.value)} />
            <button onClick={handleTranslate}>Translate</button>
            <p>{result}</p>
        </div>
    );
}

export default Translator;
