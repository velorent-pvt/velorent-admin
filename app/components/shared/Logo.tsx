import { Link } from "react-router";
import { useSidebar } from "../ui/sidebar";

export default function Logo() {
  const { state } = useSidebar();

  const logoURL = state === "collapsed" ? "./logo-small.png" : "/logo.png";

  return (
    <Link to="/">
      <img
        src={logoURL}
        alt="Velorent Logo"
        className={state === "collapsed" ? "w-8 h-8 my-8" : "w-full h-32"}
      />
    </Link>
  );
}
