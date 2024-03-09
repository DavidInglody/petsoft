export default function AppFooter() {
  return (
    <div className="mt-auto border-t  border-black/5 py-5">
      <small className="opacity-50">
        &copy; {new Date().getFullYear()} Inglody. All rights reserved
      </small>
    </div>
  );
}
