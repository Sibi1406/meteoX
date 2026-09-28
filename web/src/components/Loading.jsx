// components/Loading.jsx — Loading indicator
export default function Loading({ message = "Loading..." }) {
  return (
    <div className="loading-container">
      <div className="isobar-loader" aria-hidden="true">
        <span className="isobar-loader-ring" />
        <span className="isobar-loader-ring inner" />
      </div>
      <p className="loading-text">{message}</p>
    </div>
  );
}
