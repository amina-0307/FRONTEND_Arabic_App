import { useEffect, useMemo, useState } from "react";
import { getCombinedPhrases } from "../utils/phraseData";

// keep slugify consistent across app //
function slugify(str) {
    return str
        .toLowerCase()
        .trim()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

// Fisher-Yates shuffle //
function shuffleArray(arr) {
    const a= [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// pick N unique items from array (or all if N > length) //
function sampleN(arr, n) {
    const s = shuffleArray(arr);
    return s.slice(0, Math.min(n, s.length));
}

export default function QuizPage() {
    // phrases in state so UI updates is saved phrases change //
    const [phrases, setPhrases] = useState(() => getCombinedPhrases());
    const refreshPhrases = () => setPhrases(getCombinedPhrases());

    useEffect(() => {
        const onStorage = (e) => {
            if (e.key === "savedPhrases") refreshPhrases();
        };
        const onSavedUpdated = () => refreshPhrases();

        window.addEventListener("storage", onStorage);
        window.addEventListener("savedPhrasesUpdated", onSavedUpdated);

        return () => {
            window.removeEventListener("storage", onStorage);
            window.removeEventListener("savedPhrasesUpdated", onSavedUpdated);
        };
    }, []);

    //Flatten phrases into one deck of cards //
    const allCards = useMemo(() => {
        return phrases.flatMap((cat) =>
            cat.phrases.map((p) => ({
                ...p,
                category: cat.category,
                categorySlug: slugify(cat.category),
            }))
        );
    }, [phrases]);

    const categories = useMemo(() => phrases.map((c) => c.category), [phrases]);

    //QUIZ SETUP //
    const [stage, setStage] = useState("setup"); //"setup" | "quiz" | "results" //

    const [mode, setMode] = useState("random"); //"random" | "category" //
    const [countChoice, setCountChoice] = useState("10"); //"10" | "25" | "50" | "all" //
    const [selectedCategory, setSelectedCategory] = useState(categories[0] || "");

    // "english_to_arabic" | "arabic_to_english" | "mix" //
    const [questionType, setQuestionType] = useState("en_to_ar");

    // MCQ options count (4 default, but will gradually fall back to 3, if needed) //
    const OPTIONS_COUNT = 4;

    // QUIZ RUN STATE //
    const [questions, setQuestions] = useState([]);
    const [qIndex, setQIndex] = useState(0);

    const [selectedOption, setSelectedOption] = useState(null);
    const [locked, setLocked] = useState(false);

    const [correctCount, setCorrectCount] = useState(0);
    const [answersLog, setAnswersLog] = useState([]); // for results (optional) //

    //Confetti/firework trigger //
    const [celebrate, setCelebrate] = useState(false);

    const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth"});

    // BUILD QUESTIONS //
    function buildQuiz() {
        // 1. Choose base deck //
        let deck =
            mode === "category"
                ?allCards.filter((c) => c.category === selectedCategory)
                : allCards;

        if (!deck.length) {
                setQuestions([]);
                setStage("quiz");
                return;
            }

        // 2. Choose how many questions //
        let targetCount = deck.length;
        if (mode === "random") {
            if (countChoice !== "all") {
                targetCount = Number(countChoice);
            }
        } else {
            // by category: use "all cards" in that category for now //
            targetCount = deck.length;
        }

        const picked = sampleN(deck, targetCount);

        // Helper: make options for a given question direction //
        const makeOptions = (correctValue, poolValues, k = OPTIONS_COUNT) => {
            // rmeove correct from pool, pick distractors //
            const pool = poolValues.filter((v) => v !== correctValue);
            const distractors = sampleN(pool, Math.max(0, k - 1));

            // if deck is tiny, might not reach k options, so allow 3 or 2 //
            const opts = shuffleArray([correctValue, ...distractors]);
            return opts;
        };

        // pre-compute pools for options //
        const englishPool = deck.map((c) => c.english).filter(Boolean);
        const arabicPool = deck.map((c) => c.arabic).filter(Boolean);
    
        // 3. create question objects //
        const built = picked.map((card) => {
            // decide direction //
            let dir = questionType;
            if (questionType === "mix" ) {
                dir = Math.random() < 0.5 ? "en_to_ar" : "ar_to_en";
            }

            if (dir === "en_to_ar") {
                // prompt: english //
                // options: arabic + transliteration (on display) //
                const correct = card.arabic || "-";
                const options = makeOptions(correct, arabicPool, OPTIONS_COUNT).map((ar) => {
                    // find transliteration for option if it exists in deck //
                    const match = deck.find((d) => d.arabic === ar);
                    return {
                        value: ar,
                        label: `${ar}${match?.transliteration ? ` . ${match.transliteration}` : ""}`,
                    };
                });

                return {
                    id: `${card.categorySlug}-${card.english}-${card.arabic}`,
                    dir: "en_to_ar",
                    promptTop: "Choose the correct Arabic:",
                    promptMain: card.english || "-",
                    promptSub: card.category ? `Category: ${card.category}`: "",
                    correctValue: correct,
                    options,
                    // always show transliteration next to arabic in prompt if arabic is shown (not here) //
                };
            }

            // ar-to-en //
            const correct = card.english || "-";
            const options = makeOptions(correct, englishPool, OPTIONS_COUNT).map((en) => ({
                value: en,
                label: en,
            }));

            return {
                id: `${card.categorySlug}-${card.arabic}-${card.english}`,
                dir: "ar_to_en",
                promptTop: "Choose the correct English meaning:",
                promptMain: card.arabic || "-",
                promptSub: card.transliteration ? `Transliteration: ${card.transliteration}`: "",
                correctValue: correct,
                options,
            };
        });

        setQuestions(built);
        setQIndex(0);
        setSelectedOption(null);
        setLocked(false);
        setCorrectCount(0);
        setAnswersLog([]);
        setCelebrate(false);
        setStage("quiz");
        scrollToTop();
    }

    const currentQ = questions[qIndex] || null;
    const total = questions.length;

    const progressText = total ? `Question ${qIndex + 1} / ${total}`: "Question 0 / 0";

    //ANSWERING //
    function chooseOption(opt) {
        if (!currentQ || locked) return;
        setSelectedOption(opt.value);
        setLocked(true);

        const isCorrect = opt.value === currentQ.correctValue;
        if (isCorrect) setCorrectCount((c) => c + 1);

        setAnswersLog((prev) => [
            ...prev,
            {
                qIndex,
                dir: currentQ.dir,
                promptMain: currentQ.promptMain,
                correct: currentQ.correctValue,
                chosen: opt.value,
                isCorrect,
            },
        ]);
    }

    function nextQuestion() {
        if (!total) return;

        if (qIndex < total - 1) {
            setQIndex((i) => i + 1);
            setSelectedOption(null);
            setLocked(false);
            scrollToTop();
        } else {
            // finished //
            const allCorrect = correctCount === total;
            setCelebrate(allCorrect);
            setStage("results");
            scrollToTop();
        }
    }

    function restart() {
        setStage("setup");
        setQuestions([]);
        setQIndex(0);
        setSelectedOption(null);
        setLocked(false);
        setCorrectCount(0);
        setAnswersLog([]);
        setCelebrate(false);
        scrollToTop();
    }

    // If user changes category dropdown while in setup, keep it tidy //
    useEffect(() => {
        if (!categories.includes(selectedCategory) && categories[0]) {
            setSelectedCategory(categories[0]);
        }
    }, [categories, selectedCategory]);

    // RENDER //
    return (
        <div className="page">

            <h1 className="h1">📝 Quiz</h1>
            <div className="hr" />

            {stage === "setup" && (
                <div className="card">
                    <div className="metaLine">
                        <span className="metaLabel">Set up your quiz</span>
                    </div>

                    <div className="quizSetup">
                        {/* MODE */}
                        <div className="quizBlock">
                            <div className="quizBlockTitle">1) Choose mode</div>
                            <div className="flashRow" style={{ justifyContent: "flex-start" }}>
                                <button
                                    className={`btn ${mode === "random" ? "btnActive" : ""}`}
                                    onClick={() => setMode("random")}
                                    type="button"
                                >
                                    🎲 Random
                                </button>

                                <button
                                    className={`btn ${mode === "category" ? "btnActive" : ""}`}
                                    onClick={() => setMode("category")}
                                    type="button"
                                >
                                    📂 By Category
                                </button>
                            </div>

                            {mode === "random" && (
                                <div style={{ marginTop: 10}}>
                                    <label className="metaLine" style={{ fontSize: 18 }}>
                                        Number of questions:
                                    </label>
                                    <select
                                        className="select quizSelect"
                                        value={countChoice}
                                        onChange={(e) => setCountChoice(e.target.value)}
                                    >
                                        <option value="10">10</option>
                                        <option value="25">25</option>
                                        <option value="50">50</option>
                                        <option value="all">All ccards</option>
                                    </select>
                                </div>
                            )}

                            {mode === "category" && (
                                <div style={{ marginTop: 10 }}>
                                    <label className="metaLine" style={{ fontSize: 18 }}>
                                        Pick a category:
                                    </label>
                                    <select
                                        className="select quizSelect"
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                    >
                                        {categories.map((c) => (
                                            <option key={c} value={c}>
                                                {c}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="metaLine metaMuted" style={{ fontSize: 16, marginTop: 8 }}>
                                        This will quiz you on all cards in the chosen category.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* QUESTION TYPE */}
                        <div className="quizBlock">
                            <div className="quizBlockTitle">2) Question Type</div>
                            <div className="flashRow" style={{ justifyContent: "flex-start" }}>
                                <button
                                    className={`btn ${questionType === "en_to_ar" ? "btnActive" : ""}`}
                                    onClick={() => setQuestionType("en_to_ar")}
                                    type="button"
                                >
                                    English → Arabic (+ Transliteration)
                                </button>

                                <button
                                    className={`btn ${questionType === "ar_to_en" ? "btnActive" : ""}`}
                                    onClick={() => setQuestionType("ar_to_en")}
                                    type="button"
                                >
                                    Arabic (+ Transliteration) → English
                                </button>

                                <button
                                    classname={`btn ${questionType === "mix" ? "btnActive" : ""}`}
                                    onClick={() => setQuestionType("mix")}
                                    type="button"
                                >
                                    🔀 Mix
                                </button>
                            </div>
                        </div>

                        {/* ANSWER STYLE */}
                        <div className="quizBlock">
                            <div className="quizBlockTitle">3) Answer style</div>
                            <div className="metaLine" style={{ fontSize: 18 }}>
                                Multiple Choice (automatic)
                            </div>
                            <div className="metaLine metaMuted" style={{ fontSize: 16 }}>
                                Each question shows up to {OPTIONS_COUNT} options (falls back to fewer if needed).
                            </div>
                        </div>

                        <div className="center" style={{ marginTop: 18 }}>
                            <button className="btn" onClick={buildQuiz} type="button">
                                ✅ Start Quiz
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {stage === "quiz" && (
                <>
                {!currentQ ? (
                    <div className="card">
                        <div className="metaLine">No quiz questions available for this selection 😅</div>
                        <div className="center" style={{ marginTop: 14 }}>
                            <button className="btn" onClick={restart} type="button">
                                ⬅️ Back to Setup
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="quizMeta">
                            <div>
                                <strong>{progressText}</strong>
                            </div>
                            <div>
                                ✅ Correct: <strong>{correctCount}</strong>
                            </div>
                        </div>

                            <div className="card quizQuestion">
                                <div className="metaLine" style={{ fontSize: 18, marginBottom: 8 }}>
                                    {currentQ.promptTop}
                                </div>

                                <div style={{ fontSize: 32 }}>{currentQ.promptMain}</div>

                                {currentQ.promptSub ? (
                                    <div className="metaLine metaMuted" style={{ fontSzie: 18, marginTop: 8 }}>
                                        {currentQ.promptSub}
                                    </div>
                                ) : null}
                            </div>

                            <div className="quizOptions">
                                {currentQ.options.map((opt) => {
                                    const isChosen = selectedOption === opt.value;
                                    const isCorrect = opt.value === currentQ.correctValue;

                                    let extraClass = "";
                                    if (locked && isCorrect) extraClass = " quizOptCorrect";
                                    if (locked && isChosen && !isCorrect) extraClass = " quizOptWrong";
                                    if (!locked && isChosen) extraClass = " btnActive";

                                    return (
                                        <button
                                            key={opt.value}
                                            className={`btn quizOpt${extraClass}`}
                                            onClick={() => chooseOption(opt)}
                                            disabled={locked}
                                            type="button"
                                        >
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="center" style={{ marginTop: 18 }}>
                                <button className="btn" onClick={nextQuestion} disabled={!locked} type="button">
                                    {qIndex < total - 1 ? "Next ⏩" : "Finish ✅"}
                                </button>
                            </div>

                            <div className="center" style={{ marginTop: 14}}>
                                <button className="btn" onClick={restart} type="button">
                                    ↩️ Restart / Change Settings
                                </button>
                            </div>
                        </>
                    )}
                </>
            )}

            {stage === "results" && (
                <div className="card" style={{ position: "relative", overflow: "hidden" }}>
                    {celebrate && (
                        <div className="fireworks" aria-hidden="true">
                            <span className="spark s1" />
                            <span className="spark s2" />
                            <span className="spark s3" />
                            <span className="spark s4" />
                            <span className="spark s5" />
                            <span className="spark s6" />
                        </div>
                    )}

                    <h2 className="h2" style={{ marginTop: 4 }}>
                        {correctCount === total && total > 0 ? "🎆 Perfect Score!" : "📊 Quiz Results"}
                    </h2>

                    <div className="hr" />

                    <div className="metaLine" style={{ textAlign: "center" }}>
                        You got <strong>{correctCount}</strong> out of <strong>{total}</strong> correct.
                    </div>

                    {correctCount === total && total > 0 && (
                        <div className="metaLine" style={{ textAlign: "center", marginTop: 10 }}>
                            May your memory be as sticky as honey on a warn spoon 🍯🧠
                        </div>
                    )}

                    <div className="center" style={{ marginTop: 18 }}>
                        <button className="btn" onClick={restart} type="button">
                            ⬅️ Back to Setup
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
