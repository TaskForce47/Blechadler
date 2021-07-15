export default function format(seconds: number): string {
    function pad(s) {
        return (s < 10 ? '0' : '') + s;
    }
    const hours = Math.floor(seconds / (60 * 60));
    const minutes = Math.floor(seconds % (60 * 60) / 60);
    const secondss = Math.floor(seconds % 60);

    return pad(hours) + ':' + pad(minutes) + ':' + pad(secondss);
}
