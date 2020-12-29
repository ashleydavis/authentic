
//
// A function that adapts an async handler to work with react.
//
export function asyncHandler (self: any, handler: (...args: any[]) => Promise<void>): (() => Promise<void>) {
    return (...args: any[]): Promise<void> => {
        return handler.apply(self, args)
            .catch((err: any) => {
                console.error("Error in async handler.");
                console.error(err && err.stack || err);
            });
    };
}