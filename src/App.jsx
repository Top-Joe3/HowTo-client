import "./App.css";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArticlesContainer,
  ArticlePage,
  Login,
  About,
  Register,
} from "./components/components.jsx";
import { jwtDecode } from "jwt-decode";
import { Routes, Route } from "react-router-dom";
import themeIcon from "./assets/theme.png";
const API_URL = import.meta.env.VITE_API_URL;

function getValidUserFromToken() {
  const token = localStorage.getItem("token");

  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    const now = Date.now() / 1000;

    if (decoded.exp < now) {
      localStorage.removeItem("token");
      return null;
    }

    return decoded;
  } catch {
    localStorage.removeItem("token");
    return null;
  }
}

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(() => getValidUserFromToken());
  const [refetch, setRefetch] = useState(0);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });
  const [showMenu, setShowMenu] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const controller = new AbortController();
    async function fetchData() {
      try {
        const response = await fetch(`${API_URL}/articles/published`, {
          signal: controller.signal,
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`);
        }
        const data = await response.json();
        setArticles(data.data);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    return () => controller.abort();
  }, [refetch]);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove("dark", "light");
    root.classList.add(theme); 
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;

    const remainingTime = user.exp * 1000 - Date.now();

    if (remainingTime <= 0) {
      localStorage.removeItem("token");
      setUser(null);
      navigate("/");
      return;
    }

    const timer = setTimeout(() => {
      localStorage.removeItem("token");
      setUser(null);
      navigate("/");
    }, remainingTime);

    return () => clearTimeout(timer);
  }, [user, navigate]);

  function handleClickTheme() {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }
  return (
    <>
      <header>
        <p className="name">HowTo</p>

        <nav>
          <span onClick={handleClickTheme}>
            <img src={themeIcon} alt="theme icon" className="themeIcon"/>
          </span>
          <Link to="/about" className="about">
            About us
          </Link>

          {user && (
            <div
              className="userMenu"
              onMouseEnter={() => setShowMenu(true)}
              onMouseLeave={() => setShowMenu(false)}
            >
              <p className="username">{user.username}</p>

              {showMenu && (
                <div className="dropdown">
                  <button
                    onClick={() => {
                      localStorage.removeItem("token");
                      setUser(null);
                      navigate("/");
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>
      </header>
      <main>
        <Routes>
          <Route
            path="/"
            element={
              <ArticlesContainer
                articles={articles}
                loading={loading}
                error={error}
              />
            }
          />
          <Route
            path="/article/:id"
            element={
              <ArticlePage
                articles={articles}
                user={user}
                onCommentAdded={() => setRefetch((c) => c + 1)}
                getValidUserFromToken={getValidUserFromToken}
                setUser={setUser}
              ></ArticlePage>
            }
          />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login onLogin={setUser} />}></Route>
          <Route path="/users" element={<Register />} />
        </Routes>
      </main>
      <footer>
        <p>A webCraft.dev creations | ackumeyjoseph1@gmail.com</p>
      </footer>
    </>
  );
}

export default App;
