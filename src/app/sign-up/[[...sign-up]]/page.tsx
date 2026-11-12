import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <section className="auth-page">
      <div className="auth-page-heading">
        <p className="eyebrow">CodeMechanic account</p>
        <h1>Create your account</h1>
        <p>Save your games and return to them anytime.</p>
      </div>
      <SignUp
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/projects"
      />
    </section>
  );
}
