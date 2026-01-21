import { Link, NavLink } from "react-router-dom";

export default function PageHeader({ theme, toggleTheme, showExtras }) {
    return (
        <header className="pageHeader">
            <div className="pageHeaderInner">
                {/* LEFT: nav links */}
                <nav className="pageHeaderNav headerLeft">
                    <NavLink className="navlink" to="/">Home</NavLink>
                    <NavLink className="navlink" to="/categories">Categories</NavLink>
                    <NavLink className="navlink" to="/flashcards">Flashcards</NavLink>
                    <NavLink className="navlink" to="/quiz">Quiz</NavLink>
                </nav>

                {/* CENTRE: Home + theme (NOT on homepage) */}
                <div className="headerCenter">
                    {showExtras ? (
                        <>
                            <Link to="/" className="headerPill">⬅️ Home</Link>
                            <button
                                className="headerIconBtn" 
                                onClick={toggleTheme}
                                title="Toggle theme"
                                type="button"
                            >
                                {theme === "dark" ? "☀️" : "🌙"}
                            </button>
                        </>
                    ) : null}
                </div>

                {/* RIGHT: empty spacer (Top button is separate/fixed) */}
                <div className="headerRight" />
            </div>
        </header>
    );
}
