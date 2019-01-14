
/**
 * Sleep for specified millseconds.
 * 
 * @param timeMS Amount of milliseconds to sleep for.
 */
export async function sleep(timeMS: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        setTimeout(() => resolve(), timeMS);
    });    
}