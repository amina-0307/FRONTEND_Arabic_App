function PhraseCard({ phrase, translation, transliteration }) {
    return (
        <div className="phrase-card">
            <h3>{phrase}</h3>
            <p><strong>Arabic:</strong> {translation}</p>
            <p><strong>Transliteration:</strong> {transliteration}</p>
        </div>
    );
}

export default PhraseCard;