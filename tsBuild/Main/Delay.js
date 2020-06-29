"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function DelaySeconds(secs) {
    return DelayMilliseconds(secs * 1000);
}
exports.DelaySeconds = DelaySeconds;
async function DelayMilliseconds(millis) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            return resolve();
        }, millis);
    });
}
exports.DelayMilliseconds = DelayMilliseconds;
//# sourceMappingURL=Delay.js.map