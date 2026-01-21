import { NavLink } from "react-router-dom";

export default function Navbar() {
    return (
        <nav className="navbar">
            <div className="nav-links">
                <NavLink className="navlink" to="/">
                    Home
                </NavLink>
                <NavLink className="navlink" to="/categories">
                    Categories
                </NavLink>
                <NavLink className="navlink" to="/flashcards">
                    Flashcards
                </NavLink>
                <NavLink className="navlink" to="/quiz">
                    Quiz
                </NavLink>
            </div>
        </nav>
    );
}
