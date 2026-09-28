export function assertNoSystemAfterUser(messages) {
    let sawNonSystem = false;
    for (const m of messages) {
        if (m.role === 'system') {
            if (sawNonSystem) {
                throw new Error('system message must precede all other messages');
            }
        }
        else {
            sawNonSystem = true;
        }
    }
}
//# sourceMappingURL=messages.mapper.js.map