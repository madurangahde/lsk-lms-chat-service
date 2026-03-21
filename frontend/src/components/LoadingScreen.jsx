export default function LoadingScreen({ label = 'Loading...' }) {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      <p>{label}</p>
    </div>
  );
}
