const migrations = [
  {
    number: "01",
    name: "Profiles",
    detail: "User profiles linked to Supabase Auth",
    file: "001_create_profiles_table.sql",
    accent: "mint",
  },
  {
    number: "02",
    name: "Projects",
    detail: "Project records, ownership, and update timestamps",
    file: "002_create_projects_table.sql",
    accent: "blue",
  },
  {
    number: "03",
    name: "Project likes",
    detail: "Unique user-to-project likes with access policies",
    file: "003_create_project_likes_table.sql",
    accent: "pink",
  },
  {
    number: "04",
    name: "Play counts",
    detail: "Atomic function for recording a project play",
    file: "004_create_increment_play_count_function.sql",
    accent: "yellow",
  },
  {
    number: "05",
    name: "Sprite storage",
    detail: "Storage bucket setup notes and file size guidance",
    file: "005_create_storage_bucket.sql",
    accent: "orange",
  },
];

const schemaGroups = [
  {
    title: "Project building blocks",
    items: ["Project", "Sprite", "Level data", "Hitbox"],
  },
  {
    title: "Game configuration",
    items: ["Mechanics", "Economy", "Audio", "Wave spawner"],
  },
  {
    title: "Platform records",
    items: ["Profile", "Create project", "Update project"],
  },
];

export default function Home() {
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="CodeMechanic home">
          <span className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </span>
          <span>CodeMechanic</span>
          <span className="brand-divider" />
          <span className="brand-section">Phase 1 preview</span>
        </a>
        <nav className="top-nav" aria-label="Main navigation">
          <a href="#foundation">Foundation</a>
          <a href="#schemas">Schemas</a>
          <a href="#storage">Storage</a>
        </nav>
        <a className="branch-chip" href="#status">
          <span className="branch-dot" />
          Phase 1
          <span className="branch-chevron">↗</span>
        </a>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            PLATFORM FOUNDATIONS <span className="eyebrow-slash">/</span> 01
          </div>
          <h1>
            A solid base
            <br />
            for <span>big ideas.</span>
          </h1>
          <p className="hero-description">
            The first layer of CodeMechanic is in place: user data, project
            records, validation, and the beginnings of a reliable asset
            pipeline.
          </p>
          <a className="primary-link" href="#foundation">
            Explore the foundation <span aria-hidden="true">↓</span>
          </a>
        </div>

        <aside className="hero-card" aria-label="Phase 1 summary">
          <div className="card-topline">
            <span>BUILD SNAPSHOT</span>
            <span className="snapshot-icon">✳</span>
          </div>
          <div className="snapshot-title">The groundwork</div>
          <div className="snapshot-subtitle">Database &amp; auth foundations</div>
          <div className="snapshot-rule" />
          <div className="snapshot-row">
            <span>Database migrations</span>
            <strong>05</strong>
          </div>
          <div className="snapshot-row">
            <span>Validation schemas</span>
            <strong>12<span className="plus">+</span></strong>
          </div>
          <div className="snapshot-row">
            <span>Storage cleanup function</span>
            <strong>01</strong>
          </div>
          <div className="snapshot-foot">
            <span className="mini-status" />
            SOURCE FILES IN THIS BRANCH
          </div>
          <span className="card-decoration decoration-one" />
          <span className="card-decoration decoration-two" />
        </aside>

        <div className="hero-bottom">
          <span>01 — 03</span>
          <span className="hero-bottom-line" />
          <span>DATABASE · VALIDATION · STORAGE</span>
        </div>
      </section>

      <section className="status-strip" id="status">
        <div className="status-copy">
          <span className="status-indicator" />
          <span>
            <strong>Previewing Phase 1</strong>
            <span className="status-note">
              &nbsp; · &nbsp; foundation files are present in this branch
            </span>
          </span>
        </div>
        <span className="status-branch">vibe / phase1-db-auth</span>
      </section>

      <section className="content-section foundation-section" id="foundation">
        <div className="section-heading">
          <div>
            <div className="section-kicker">01 / DATABASE</div>
            <h2>Structure that keeps its shape.</h2>
          </div>
          <p className="section-intro">
            A small set of ordered migrations defines the core records,
            permissions, and database helpers the platform can build on.
          </p>
        </div>

        <div className="migration-list">
          {migrations.map((migration) => (
            <article
              className="migration-row"
              key={migration.number}
              id={migration.number === "05" ? "storage" : undefined}
            >
              <div className={`migration-index ${migration.accent}`}>
                {migration.number}
              </div>
              <div className="migration-main">
                <h3>{migration.name}</h3>
                <p>{migration.detail}</p>
              </div>
              <code>{migration.file}</code>
              <span className="file-state">
                <span />
                IN REPO
              </span>
            </article>
          ))}
        </div>
        <p className="quiet-note">
          Migration files are included here; applying them to a Supabase
          project is a separate setup step.
        </p>
      </section>

      <section className="split-section" id="schemas">
        <div className="schema-panel">
          <div className="section-kicker">02 / VALIDATION</div>
          <h2>Clear contracts.<br />Fewer surprises.</h2>
          <p>
            Zod schemas describe the data flowing through projects and game
            configuration, with TypeScript types available alongside them.
          </p>
          <div className="schema-groups">
            {schemaGroups.map((group, index) => (
              <div className="schema-group" key={group.title}>
                <span className="schema-group-number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3>{group.title}</h3>
                  <div className="tag-list">
                    {group.items.map((item) => (
                      <span className="schema-tag" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="code-sample">
            <span className="code-dot" />
            <span className="code-dot" />
            <span className="code-dot" />
            <code>
              <span className="code-muted">const</span> project ={" "}
              ProjectSchema.parse(data)
            </code>
          </div>
        </div>

        <aside className="storage-panel">
          <div className="storage-art" aria-hidden="true">
            <div className="storage-grid" />
            <div className="storage-folder">
              <div className="folder-tab" />
              <div className="folder-front">
                <span className="folder-spark">✳</span>
                <span className="folder-label">SPRITES</span>
              </div>
            </div>
            <span className="storage-floating float-a">PNG</span>
            <span className="storage-floating float-b">500 KB</span>
            <span className="storage-cross cross-a">+</span>
            <span className="storage-cross cross-b">+</span>
          </div>
          <div className="section-kicker">03 / ASSET PIPELINE</div>
          <h2>Keep the project tidy.</h2>
          <p>
            A Supabase Edge Function removes sprite files associated with a
            deleted project, helping prevent orphaned assets.
          </p>
          <div className="function-callout">
            <span className="function-icon">⌘</span>
            <span>
              <strong>delete-project-assets</strong>
              <small>Supabase Edge Function · source included</small>
            </span>
            <span className="function-arrow">↗</span>
          </div>
        </aside>
      </section>

      <section className="connection-note">
        <div className="connection-icon">↗</div>
        <div>
          <div className="section-kicker">WHAT’S NEXT</div>
          <h2>Connect the backend when you’re ready.</h2>
          <p>
            This preview shows the Phase 1 source included in the branch. A
            Supabase project and its environment settings are not connected
            here yet.
          </p>
        </div>
        <div className="connection-file">
          <span className="file-glyph">↳</span>
          <span>.env.example</span>
          <span className="file-pill">REFERENCE</span>
        </div>
      </section>

      <footer className="footer">
        <a className="footer-brand" href="#top">CodeMechanic<span>®</span></a>
        <span>PHASE 1 / DATABASE &amp; AUTH FOUNDATIONS</span>
        <a href="#top" className="back-top">BACK TO TOP ↑</a>
      </footer>
    </main>
  );
}
