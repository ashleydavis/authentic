//
// Authentication service for use by the UI.
//

import axios from 'axios';
import { IEventSource, EventSource, BasicEventHandler } from '../utils/event-source';

export interface IAuthResponse {
    ok: boolean;
    errorMessage?: string;
}

export interface IAuthentication {

    //
    // Event raised when user has signed in.
    //
    onSignedIn: IEventSource<BasicEventHandler>;

    //
    // Event raised when user has signed out.
    //
    onSignedOut: IEventSource<BasicEventHandler>;

    //
    // Event raised when the signin in check has been completed.
    //
    onSigninCheckCompleted: IEventSource<BasicEventHandler>;
    
    //
    // Returns true if a user is currently known to be authenticated.
    //
    isSignedIn(): boolean;

    //
    // Asynchronously check if the user is currently signed in.
    //
    checkSignedIn(): Promise<boolean>;
    
    //
    // Returns true if a signin check with the server has completed.
    //
    signinCheckCompleted(): boolean;

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

    //
    // Set to true when the user is known to be currently signed in
    //
    private signedIn: boolean = false;

    //
    // Set to true when the signin check has been completed.
    //
    private signedInCheck: boolean = false;
    
    static getInstance(): IAuthentication {
        if (!Authentication.instance) {
            Authentication.instance = new Authentication();
        }

        return Authentication.instance!;
    }

    //
    // Event raised when user has signed in.
    //
    onSignedIn: IEventSource<BasicEventHandler> = new EventSource<BasicEventHandler>();

    //
    // Event raised when user has signed out.
    //
    onSignedOut: IEventSource<BasicEventHandler> = new EventSource<BasicEventHandler>();

    //
    // Event raised when the signin in check has been completed.
    //
    onSigninCheckCompleted: IEventSource<BasicEventHandler> = new EventSource<BasicEventHandler>();
    
    //
    // Returns true if a user is currently known to be authenticated.
    //
    isSignedIn(): boolean {
        return this.signedIn;
    }

    //
    // Asynchronously check if the user is currently signed in.
    //
    async checkSignedIn(): Promise<boolean> {
        
        const result = await axios.get("/api/auth/signedin");
        this.updateSignedinState(result.data.signedin);
        return this.signedIn;
    }

    //
    // Update install state.
    //
    private updateSignedinState(nowSignedIn: boolean) {
        const stateChanged = this.signedIn !== nowSignedIn;
        this.signedIn = nowSignedIn;
        this.signedInCheck = true;
        if (stateChanged) {
            if (this.signedIn) {
                this.onSignedIn.raise();
            }
            else {
                this.onSignedOut.raise();
            }
        }

        this.onSigninCheckCompleted.raise();
    }

    //
    // Returns true if a signin check with the server has completed.
    //
    signinCheckCompleted(): boolean {
        return this.signedInCheck;
    }

    //
    // Sign a user in.
    //
    async signin(email: string, password: string): Promise<IAuthResponse> {
        const response = await axios.post("/api/auth/signin", {
            email: email,
            password: password,
        });

        this.updateSignedinState(response.data.ok);
        return response.data;
    }

    //
    // Sign a user out.
    //
    async signout(): Promise<void> {
        await axios.post("/api/auth/signout");
        this.updateSignedinState(false);
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