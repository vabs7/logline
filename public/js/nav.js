// Navigation & Auth State Management for Cinerolls
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

export function initNav() {
  const authNavSlot = document.getElementById('authNavSlot');
  if (!authNavSlot) return;

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      let isAdmin = false;
      try {
        const adminDocSnap = await getDoc(doc(db, 'admins', user.uid));
        isAdmin = adminDocSnap.exists();
      } catch (err) {
        console.warn('Could not inspect admin status:', err);
      }

      const adminPill = isAdmin
        ? '<a href="admin.html" class="btn btn-outline" style="border-color: var(--accent-gold); color: var(--accent-gold);">Admin</a>'
        : '';

      authNavSlot.innerHTML = `
        <div style="display: flex; gap: var(--space-xs); align-items: center;">
          ${adminPill}
          <a href="account.html" class="btn btn-outline" id="authButton">Account</a>
        </div>
      `;
    } else {
      authNavSlot.innerHTML = `
        <a href="signin.html" class="btn btn-outline" id="authButton">Sign In</a>
      `;
    }
  });
}
