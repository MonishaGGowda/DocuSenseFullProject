class HeaderComponent extends HTMLElement {
  constructor() {
      super();
      const logoutUrl = this.getAttribute('data-logout-url'); // Dynamically passed URL
      this.innerHTML = `
      <header>
        <nav>
          <div class="logo">
            <span>DOCUSENSE</span>
          </div>
          <div class="nav-links">
            <a href="/home_page" title="Click to go back to the Start">Home</a>
            <a href="${logoutUrl}" title="Logout of the session">Logout</a>
          </div>
        </nav>
      </header>
    `;
  }
}

customElements.define('header-component', HeaderComponent);
