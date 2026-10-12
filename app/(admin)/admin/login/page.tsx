import { redirect } from "next/navigation";
import { login } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Вход" };

export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  if (await getCurrentUser()) redirect("/admin");
  return (
    <div className="login-wrap">
      <form action={login} className="card login-card">
        <div className="brand" style={{ marginBottom: 20 }}>
          <img src="/logo.png" alt="" />
          <span>NEXTIMO<small>АДМИН ПАНЕЛ</small></span>
        </div>
        {searchParams.error === "1" && <div className="alert">Грешен имейл или парола.</div>}
        {searchParams.error === "locked" && <div className="alert">Твърде много опити. Опитайте след 15 минути.</div>}
        <div className="field">
          <label>Имейл</label>
          <input name="email" type="email" required autoComplete="username" />
        </div>
        <div className="field">
          <label>Парола</label>
          <input name="password" type="password" required autoComplete="current-password" />
        </div>
        <button className="btn" style={{ width: "100%" }}>Вход</button>
      </form>
    </div>
  );
}
