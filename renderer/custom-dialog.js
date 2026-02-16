const CustomDialog = {
    init() {
        if (document.getElementById('custom-modal')) return;
        const div = document.createElement('div');
        div.id = 'custom-modal';
        div.className = 'modal-overlay';
        div.innerHTML = `
            <div class="modal-glass">
                <div class="modal-icon" id="modal-icon">⚠️</div>
                <div class="modal-title" id="modal-title">Confirm Action</div>
                <div class="modal-message" id="modal-msg">Are you sure?</div>
                <div class="modal-actions" id="modal-actions"></div>
            </div>
        `;
        document.body.appendChild(div);
    },

    show(options) {
        this.init();
        const modal = document.getElementById('custom-modal');
        const icon = document.getElementById('modal-icon');
        const title = document.getElementById('modal-title');
        const msg = document.getElementById('modal-msg');
        const actions = document.getElementById('modal-actions');

        icon.textContent = options.icon || '⚠️';
        title.textContent = options.title || 'Alert';
        msg.textContent = options.message || '';

        actions.innerHTML = '';

        return new Promise((resolve) => {
            options.buttons.forEach(btn => {
                const b = document.createElement('button');
                b.className = `modal-btn ${btn.type || 'secondary'}`;
                b.textContent = btn.text;
                b.onclick = () => {
                    modal.classList.remove('active');
                    setTimeout(() => resolve(btn.value), 300); // Wait for transition
                };
                actions.appendChild(b);
            });

            // Show
            requestAnimationFrame(() => modal.classList.add('active'));
        });
    },

    async confirm(message, title = 'Confirmation') {
        return await this.show({
            title,
            message,
            icon: '❓',
            buttons: [
                { text: 'Cancel', value: false, type: 'secondary' },
                { text: 'Confirm', value: true, type: 'primary' }
            ]
        });
    },

    async alert(message, title = 'Notice') {
        return await this.show({
            title,
            message,
            icon: 'ℹ️',
            buttons: [
                { text: 'OK', value: true, type: 'primary' }
            ]
        });
    }
};

window.CustomDialog = CustomDialog;
