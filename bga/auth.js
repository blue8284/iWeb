// Authentication Module - Login Spell Verification
const authModule = {
    currentUser: null,
    
    // Initialize authentication
    async init() {
        const players = dataModule.getUniquePlayers();
        
        // Check if user is already authenticated in this browser tab.
        const storedUsername = sessionStorage.getItem('authenticated_user');
        if (storedUsername) {
            const user = players.find(p => p.username === storedUsername);
            if (user) {
                this.currentUser = user;
                return user;
            }
        }
        
        // Show login prompt on first access.
        return await this.promptForSpell();
    },
    
    // Prompt user for login spell
    async promptForSpell() {
        return new Promise((resolve, reject) => {
            // Create overlay
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.background = 'rgba(0, 0, 0, 0.8)';
            overlay.style.backdropFilter = 'blur(8px)';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = '10000';
            
            // Create modal
            const modal = document.createElement('div');
            modal.style.background = 'var(--color-background)';
            modal.style.borderRadius = 'var(--radius-lg)';
            modal.style.padding = 'var(--spacing-xl)';
            modal.style.maxWidth = '400px';
            modal.style.width = '90%';
            modal.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.5)';
            
            // Title
            const title = document.createElement('h2');
            title.textContent = 'Enter Your Login Spell';
            title.style.marginBottom = 'var(--spacing-md)';
            title.style.textAlign = 'center';
            title.style.color = 'var(--color-text)';
            modal.appendChild(title);
            
            // Subtitle
            const subtitle = document.createElement('p');
            subtitle.textContent = 'Speak your magic words to access the dashboard';
            subtitle.style.textAlign = 'center';
            subtitle.style.color = 'var(--color-text-light)';
            subtitle.style.fontSize = 'var(--font-size-sm)';
            subtitle.style.marginBottom = 'var(--spacing-lg)';
            modal.appendChild(subtitle);
            
            // Input
            const input = document.createElement('input');
            input.type = 'text';
            input.placeholder = 'Type your login spell...';
            input.style.width = '100%';
            input.style.padding = 'var(--spacing-md)';
            input.style.border = '2px solid var(--color-border)';
            input.style.borderRadius = 'var(--radius-md)';
            input.style.fontSize = 'var(--font-size-base)';
            input.style.fontFamily = 'var(--font-family)';
            input.style.marginBottom = 'var(--spacing-sm)';
            input.style.outline = 'none';
            input.style.transition = 'border-color 0.2s';
            
            input.addEventListener('focus', () => {
                input.style.borderColor = 'var(--color-primary)';
            });
            
            input.addEventListener('blur', () => {
                input.style.borderColor = 'var(--color-border)';
            });
            
            modal.appendChild(input);
            
            // Error message
            const error = document.createElement('div');
            error.style.color = 'var(--color-danger)';
            error.style.fontSize = 'var(--font-size-sm)';
            error.style.marginBottom = 'var(--spacing-md)';
            error.style.textAlign = 'center';
            error.style.minHeight = '20px';
            modal.appendChild(error);
            
            // Button
            const button = document.createElement('button');
            button.textContent = 'Enter';
            button.className = 'btn btn-primary';
            button.style.width = '100%';
            button.style.padding = 'var(--spacing-md)';
            button.style.fontSize = 'var(--font-size-base)';
            modal.appendChild(button);
            
            // Verify function
            const verify = () => {
                const spell = input.value.trim();
                if (!spell) {
                    error.textContent = 'Please enter your login spell';
                    input.focus();
                    return;
                }
                
                // Find player by login_spell (case-insensitive)
                const players = dataModule.getUniquePlayers();
                const user = players.find(p =>
                    p.login_spell && p.login_spell.toLowerCase().trim() === spell.toLowerCase().trim()
                );
                
                if (user) {
                    this.currentUser = user;
                    sessionStorage.setItem('authenticated_user', user.username);
                    document.body.removeChild(overlay);
                    resolve(user);
                } else {
                    error.textContent = 'Spell not recognized. Try again.';
                    input.value = '';
                    input.focus();
                    input.style.borderColor = 'var(--color-danger)';
                    setTimeout(() => {
                        input.style.borderColor = 'var(--color-border)';
                    }, 2000);
                }
            };
            
            // Event listeners
            button.addEventListener('click', verify);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    verify();
                }
            });
            
            // Assemble and show
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            input.focus();
        });
    },
    
    // Get current authenticated user
    getCurrentUser() {
        return this.currentUser;
    },
    
    // Logout
    logout() {
        sessionStorage.removeItem('authenticated_user');
        this.currentUser = null;
        window.location.reload();
    }
};

// Export
window.authModule = authModule;
