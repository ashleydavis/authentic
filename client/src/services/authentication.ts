//
// Authentication service for use by the UI.
//

import axios from 'axios';

export interface IAuthResponse {
    ok: boolean;
    errorMessage?: string;
}

export interface IAuthentication {

    //
    // Returns true if a user is currently authenticated.
    //
    isSignedIn(): Promise<boolean>;

    //
    // Sign a user in.
    //
    signin(email: string, password: string): Promise<IAuthResponse>;

    //
    // Sign a user out.
    //
    signout(): Promise<void>;

    //
    // Register a new user.
    //
    register(email: string, password: string): Promise<IAuthResponse>;

    //
    // Resend a confirmation email to an unconfirmed user.
    //
    resendConfirmationEmail(email: string): Promise<void>;
    
    //
    // Request a password reset for a user.
    //
    requestPasswordReset(email: string): Promise<void>;

    //
    // Set a user's password to a new value.
    //
    resetPassword(email: string, password: string, token: string): Promise<IAuthResponse>;

    //
    // Set a user's password to a new value.
    //
    updatePassword(password: string): Promise<void>;
    
    //
    // Confirm user's account.
    //
    confirm(email: string, token: string): Promise<IAuthResponse>;
}

export class Authentication implements IAuthentication {

    //
    // Singleton instance.
    //
    private static instance: IAuthentication | null;

    static getInstance(): IAuthentication {
        if (!Authentication.instance) {
            Authentication.instance = new Authentication();
        }

        return Authentication.instance!;
    }

    //
    // Returns true if a user is currently authenticated.
    //
    async isSignedIn(): Promise<boolean> {
        const result = await axios.get("/api/auth/signedin");
        return result.data.signedin;
    }

    //
    // Sign a user in.
    //
    async signin(email: string, password: string): Promise<IAuthResponse> {
        const response = await axios.post("/api/auth/signin", {
            email: email,
            password: password,
        });

        return response.data;
    }

    //
    // Sign a user out.
    //
    async signout(): Promise<void> {
        await axios.post("/api/auth/signout");
    }

    //
    // Register a new user.
    //
    async register(email: string, password: string): Promise<IAuthResponse> {
        const response = await axios.post("/api/auth/register", {
            email: email,
            password: password,
        });

        return response.data;
    }

    //
    // Resend a confirmation email to an unconfirmed user.
    //
    async resendConfirmationEmail(email: string): Promise<void> {
        await axios.post("/api/auth/resend-confirmation-email", {
            email: email,
        });
    }

    //
    // Request a password reset for a user.
    //
    async requestPasswordReset(email: string): Promise<void> {
        await axios.post("/api/auth/request-password-reset", {
            email: email,
        });
    }

    //
    // Set a user's password to a new value.
    //
    async resetPassword(email: string, password: string, token: string): Promise<IAuthResponse> {
        const response = await axios.post("/api/auth/reset-password", {
            email: email,
            password: password,
            token: token,
        });

        return response.data;
    }

    //
    // Set a user's password to a new value.
    //
    async updatePassword(password: string): Promise<void> {
        await axios.post("/api/auth/update-password", {
            password: password,
        });
    }
    
    //
    // Confirm user's account.
    //
    async confirm(email: string, token: string): Promise<IAuthResponse> {
        const response = await axios.post("/api/auth/confirm", {
            email: email,
            token: token,
        });

        return response.data;
    }
}