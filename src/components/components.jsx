import { jwtDecode } from "jwt-decode";
import { useState } from "react";
import { Link, useParams, useNavigate, useLocation } from "react-router-dom";
import DOMPurify from "dompurify";

const API_URL = import.meta.env.VITE_API_URL;

export function ArticlesContainer({ articles, loading, error }) {
  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="articlesContainer">
      {articles.map((article) => {
        const cleanTitle = DOMPurify.sanitize(article.title);
        const cleanBody = DOMPurify.sanitize(article.body);
        return (
          <Article
            key={article.id}
            id={article.id}
            title={cleanTitle}
            body={cleanBody}
            createdAt={article.createdAt}
            updatedAt={article.updatedAt}
          ></Article>
        );
      })}
    </div>
  );
}

export function Article({ id, title, body, createdAt, updatedAt, children }) {
  const created = new Date(createdAt);
  const updated = new Date(updatedAt);

  const isUpdated = created.getTime() !== updated.getTime();

  return (
    <Link to={`/article/${id}`} className="articleLink">
      <div className="article">
        <div dangerouslySetInnerHTML={{ __html: title }} />
        <div
          dangerouslySetInnerHTML={{ __html: body }}
          className="articleBody"
        />
        <div className="date">
          <p>
            Posted on:{" "}
            {created.toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}
          </p>

          {isUpdated && (
            <p>
              Updated on:{" "}
              {updated.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })}
            </p>
          )}
        </div>

        {children}
      </div>
    </Link>
  );
}

export function Comments({
  comments,
  user,
  articleId,
  onCommentAdded,
  getValidUserFromToken,
  setUser,
}) {
  const [userComment, setUserComment] = useState(() => {
    return sessionStorage.getItem(`draft-${articleId}`) || "";
  });
  const [showModal, setShowModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const validUser = getValidUserFromToken();

    if (!validUser) {
      setUser(null);
      setShowModal(true);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/articles/${articleId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ comment: userComment }),
      });

      if (!res.ok) {
        throw new Error("Failed to post comment");
      }

      sessionStorage.removeItem(`draft-${articleId}`);
      setUserComment("");
      onCommentAdded();
    } catch (error) {
      console.error(error.message);
      alert(error.message);
    }
  }

  async function handleDelete(commentId) {
    try {
      const res = await fetch(`${API_URL}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to delete comment");
      }

      setSelectedComment(null);
      onCommentAdded(); // refetch
    } catch (error) {
      console.error(error.message);
      alert(error.message);
    }
  }

  async function handleUpdate(commentId, newBody) {
    try {
      const res = await fetch(`${API_URL}/comments/${commentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ comment: newBody }),
      });

      if (!res.ok) {
        throw new Error("Failed to update comment");
      }
      setSelectedComment(null);
      onCommentAdded(); // refetch
    } catch (error) {
      console.error(error.message);
      alert(error.message);
    }
  }

  return (
    <div className="commentsContainer">
      <h4>Comments</h4>
      {comments.length === 0 ? (
        <p>Be first to comment</p>
      ) : (
        comments.map((comment) => {
          const created = new Date(comment.createdAt);
          const updated = new Date(comment.updatedAt);
          const isUpdated = created.getTime() !== updated.getTime();
          return (
            <div
              key={comment.id}
              onClick={() => {
                const validUser = getValidUserFromToken();

                const isOwner = validUser && validUser.id === comment.userId;
                const isAdmin = validUser && validUser.role === "Admin";

                if (!isOwner && !isAdmin) return;

                setSelectedComment(comment);
              }}
              style={{ cursor: "pointer" }}
              className="eachComment"
            >
              <p className="username">{comment.user.username}</p>
              <p className="publishedDate">
                Posted on:{" "}
                {created.toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </p>
              {isUpdated && (
                <p className="editDate">
                  Updated on:{" "}
                  {updated.toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </p>
              )}
              <p className="commentBody">{comment.body}</p>
            </div>
          );
        })
      )}

      {/* Comment action modal */}
      {selectedComment && (
        <CommentModal
          comment={selectedComment}
          user={user}
          onClose={() => setSelectedComment(null)}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
        />
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          value={userComment}
          name="userComment"
          onChange={(e) => {
            setUserComment(e.target.value);
            sessionStorage.setItem(`draft-${articleId}`, e.target.value); 
          }}
        />
        <button
          className="commentSubmitBtn"
          type="submit"
          disabled={userComment.length === 0}
        >
          Submit
        </button>
        {showModal && <AuthModal onClose={() => setShowModal(false)} />}
      </form>
    </div>
  );
}

function AuthModal({ onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Login Required</h3>
        <p>
          You need to sign in or create an account before posting a comment.
        </p>

        <div className="modalButtons">
          <button
            className="modalLoginBtn"
            onClick={() => {
              onClose();
              navigate("/login", {
                state: { from: location.pathname },
              });
            }}
          >
            Login
          </button>

          <button
            className="modalRegisterBtn"
            onClick={() => {
              onClose();
              navigate("/users");
            }}
          >
            Register
          </button>
        </div>

        <button className="modalCloseBtn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

function CommentModal({ comment, user, onClose, onDelete, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(comment.body);

  const isOwner = user && user.id === comment.userId;
  const isAdmin = user && user.role === "Admin";
  const canModify = isOwner || isAdmin;

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {isEditing ? (
          <>
            <textarea
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
            />
            <button onClick={() => onUpdate(comment.id, editedBody)}>
              Save
            </button>
            <button onClick={() => setIsEditing(false)}>Cancel</button>
          </>
        ) : (
          <>
            <p>{comment.body}</p>
            {canModify && (
              <>
                {isOwner && (
                  <button onClick={() => setIsEditing(true)}>Update</button>
                )}
                <button
                  className="deleteBtn"
                  onClick={() => onDelete(comment.id)}
                >
                  Delete
                </button>
              </>
            )}
            <button onClick={onClose}>Close</button>
          </>
        )}
      </div>
    </div>
  );
}

export function ArticlePage({
  articles,
  user,
  onCommentAdded,
  getValidUserFromToken,
  setUser,
}) {
  const { id } = useParams();
  const article = articles.find((a) => a.id === Number(id));

  if (!article) return <p>Article not found.</p>;

  return (
    <div className="articlePage">
      <h1>{article.title}</h1>
      <p>{article.body}</p>
      <Comments
        comments={article.comments}
        user={user}
        articleId={article.id}
        onCommentAdded={onCommentAdded}
        getValidUserFromToken={getValidUserFromToken}
        setUser={setUser}
      ></Comments>
    </div>
  );
}

export function Login({ onLogin }) {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });

  const [loginError, setLoginError] = useState({ errors: {} });

  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setLoginError(errorData);
        return;
      }

      const data = await res.json();

      setLoginError({ errors: {} });

      localStorage.setItem("token", data.token);
      onLogin(jwtDecode(data.token));

      const from = location.state?.from || "/";
      navigate(from);
    } catch (error) {
      console.error(error.message);
      alert(error.message);
    }
  }

  return (
    <div className="authContainer">
      <form onSubmit={handleSubmit}>
        <label htmlFor="username">Enter username</label>
        <input
          type="text"
          id="username"
          value={credentials.username}
          onChange={(e) =>
            setCredentials((prev) => ({
              ...prev,
              username: e.target.value,
            }))
          }
        />

        {loginError.errors.username && (
          <sub className="error">{loginError.errors.username.msg}</sub>
        )}

        <label htmlFor="password">Enter your password</label>
        <input
          type="password"
          id="password"
          value={credentials.password}
          onChange={(e) =>
            setCredentials((prev) => ({
              ...prev,
              password: e.target.value,
            }))
          }
        />

        {loginError.errors.password && (
          <sub className="error">{loginError.errors.password.msg}</sub>
        )}

        <button className="authSubmitBtn" type="submit">
          Submit
        </button>

        <p>
          Don't have an account? <Link to="/users">Create one</Link>
        </p>
      </form>
    </div>
  );
}

export function Register() {
  const [fields, setFields] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  function handleChange(e) {
    setFields((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors(data.errors);
        return;
      }

      navigate("/login");
    } catch (error) {
      console.error(error.message);
      alert(error.message);
    }
  }

  return (
    <div className="authContainer">
      <form onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input
          type="text"
          id="username"
          name="username"
          value={fields.username}
          onChange={handleChange}
        />
        {errors.username && <p className="error">{errors.username.msg}</p>}

        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          value={fields.password}
          onChange={handleChange}
        />
        {errors.password && <p className="error">{errors.password.msg}</p>}

        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={fields.confirmPassword}
          onChange={handleChange}
        />
        {errors.confirmPassword && (
          <p className="error">{errors.confirmPassword.msg}</p>
        )}

        <button className="authSubmitBtn" type="submit">
          Register
        </button>
        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}

export function About() {
  return (
    <div className="aboutContainer">
      <h1>About Us</h1>

      <p>
        <strong>HowTo</strong> is a knowledge-driven platform built to simplify
        complex topics into clear, actionable guidance. Our goal is not just to
        inform, but to equip readers with the practical understanding needed to
        take real-world action.
      </p>

      <p>
        We focus on topics that people often find confusing or intimidating—such
        as copyright, intellectual property, digital tools, and everyday legal
        or technical processes. Each article is the result of thorough research
        and careful structuring to ensure accuracy, clarity, and usefulness.
      </p>

      <h2>What We Do</h2>

      <div className="aboutSection">
        <h3>Explain the concept</h3>
        <p>
          We break down what the topic means in simple, precise terms so it’s
          easy to understand.
        </p>
      </div>

      <div className="aboutSection">
        <h3>Provide context and purpose</h3>
        <p>
          We explore why the concept exists, its importance, and how it applies
          in real-life situations.
        </p>
      </div>

      <div className="aboutSection">
        <h3>Deliver actionable steps</h3>
        <p>
          We guide readers through the process with clear, step-by-step
          instructions so they can apply what they learn without confusion.
        </p>
      </div>

      <h2>Our Philosophy</h2>

      <ul>
        <li>
          <strong>Accurate</strong> – grounded in reliable sources
        </li>
        <li>
          <strong>Structured</strong> – logically organized for clarity
        </li>
        <li>
          <strong>Practical</strong> – focused on real-world outcomes
        </li>
      </ul>

      <h2>Who It’s For</h2>

      <p>
        Whether you're a student, creator, professional, or simply curious,
        HowTo is designed for anyone who wants to understand a subject deeply
        and apply that knowledge confidently.
      </p>

      <p className="aboutClosing">
        At its core, HowTo is about turning knowledge into action.
      </p>
    </div>
  );
}
