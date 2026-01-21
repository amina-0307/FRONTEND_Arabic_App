import { Outlet, useLocation } from "react-router-dom";
import PageHeader from "./PageHeader";

export default function Layout({ theme, toggleTheme }) {
    const location = useLocation();
    const isHome = location.pathname === "/";

    return (
        <>
            <PageHeader
                theme={theme}
                toggleTheme={toggleTheme}
                showExtras={!isHome}
            />
            <Outlet />
        </>
    );
}
