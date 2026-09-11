// components/Loading.jsx — Loading indicator
export default function Loading({ message = "Loading..." }) {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p className="loading-text">{message}</p>
    </div>
  );
}
