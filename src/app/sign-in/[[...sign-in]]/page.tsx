import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <section className="auth-page">
      <div className="auth-page-heading">
        <p className="eyebrow">CodeMechanic account</p>
        <h1>Welcome back</h1>
        <p>Sign in to save projects and continue building.</p>
      </div>
      <SignIn
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/projects"
      />
    </section>
  );
}
