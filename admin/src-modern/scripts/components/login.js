// ==========================================================================
// Login Component
// Handles admin authentication UI
// ==========================================================================

import Alpine from 'alpinejs';
import { authManager } from '../utils/auth.js';
import { NotificationManager } from '../utils/notifications.js';

document.addEventListener('alpine:init', () => {
    Alpine.data('loginForm', () => ({
        username: '',
        password: '',
        rememberMe: false,
        isLoading: false,
        showPassword: false,
        errorMessage: '',

        init() {
            // Check if already authenticated
            if (authManager.isAuthenticated()) {
                window.location.href = '/index.html';
            }

            // Setup password toggle
            const toggleButton = document.getElementById('togglePassword');
            const passwordInput = document.getElementById('password');
            const toggleIcon = document.getElementById('togglePasswordIcon');

            if (toggleButton) {
                toggleButton.addEventListener('click', () => {
                    this.showPassword = !this.showPassword;
                    passwordInput.type = this.showPassword ? 'text' : 'password';
                    toggleIcon.className = this.showPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
                });
            }
        },

        async handleLogin(e) {
            e.preventDefault();

            // Clear previous errors
            this.errorMessage = '';
            this.hideAlert();

            // Validate inputs
            if (!this.username.trim() || !this.password.trim()) {
                this.showError('Please enter both username and password');
                return;
            }

            this.isLoading = true;
            this.toggleLoadingState(true);

            try {
                // Attempt login
                const response = await authManager.login({
                    username: this.username.trim(),
                    password: this.password
                });

                // Login successful
                console.log('Login successful:', response);

                // Redirect to dashboard
                window.location.href = '/index.html';
            } catch (error) {
                console.error('Login error:', error);
                this.showError(error.message || 'Login failed. Please check your credentials and try again.');
            } finally {
                this.isLoading = false;
                this.toggleLoadingState(false);
            }
        },

        showError(message) {
            this.errorMessage = message;
            const alertEl = document.getElementById('loginAlert');
            const errorMsgEl = document.getElementById('loginErrorMessage');

            if (alertEl && errorMsgEl) {
                errorMsgEl.textContent = message;
                alertEl.classList.remove('d-none');
            }
        },

        hideAlert() {
            const alertEl = document.getElementById('loginAlert');
            if (alertEl) {
                alertEl.classList.add('d-none');
            }
        },

        toggleLoadingState(isLoading) {
            const buttonText = document.getElementById('loginButtonText');
            const buttonSpinner = document.getElementById('loginButtonSpinner');
            const submitButton = document.getElementById('loginButton');

            if (buttonText && buttonSpinner && submitButton) {
                if (isLoading) {
                    buttonText.classList.add('d-none');
                    buttonSpinner.classList.remove('d-none');
                    submitButton.disabled = true;
                } else {
                    buttonText.classList.remove('d-none');
                    buttonSpinner.classList.add('d-none');
                    submitButton.disabled = false;
                }
            }
        }
    }));
});

// Initialize form when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            // Get the Alpine component data
            // Since we're using x-data, checking the scope is reliable
            // But we can also trigger the method directly via dispatch if needed

            // Try to get data from Alpine
            // We need to wait for Alpine to initialize
        });
    }
});

// Start Alpine
window.Alpine = Alpine;
Alpine.start();

