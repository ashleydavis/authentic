//
// Authentication service for use by the UI.
//

import axios from 'axios';
import { AxiosResponse, AxiosRequestConfig } from 'axios';
import { IEventSource, EventSource, BasicEventHandler } from '../utils/event-source';

export interface IAuthResponse {
    ok: boolean;
    errorMessage?: string;
}

export const BASE_URL = ""; // Can set this to a different host if necessary.
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

    //
    // Make an authenticated HTTP GET request and return the response.
    //
    get<T = any>(route: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;

    //
    // Make an authenticated HTTP POST request and return the response.
    //
    post<T = any>(route: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;

    //
    // Make an authenticated HTTP PUT request and return the response.
    //
    put<T = any>(route: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>>;

    //
    // Create an authenticated version of a URL.
    //
    makeAuthenticatedUrl(baseUrl: string, params?: any): string;
}

export class Authentication implements IAuthentication {

    //
    // Singleton instance.
    //
    private static instance: IAuthentication | null;

    //
    // The authentication token allocated once signed in.
    //
    private authToken: string | undefined = undefined;

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
    
    private constructor() {
        // Private constructor.
    }

    //
    // Returns true if a user is currently known to be authenticated.
    //
    isSignedIn(): boolean {
        return this.authToken !== undefined;
    }

    //
    // Asynchronously check if the user is currently signed in.
    //
    async checkSignedIn(): Promise<boolean> {
        const token = localStorage.getItem("t");
        if (token) {
            // Validate token.
            const response = await axios.post(BASE_URL + "/api/auth/validate", {
                token: token,
            });

            if (!response.data.ok) {
                // Not validated.
                await this.updateSignedinState(undefined, undefined);
                return false;
            }
            else {
                await this.updateSignedinState(token, response.data.id);
            }
        }
        else {
            // Not signed in.
            await this.updateSignedinState(undefined, undefined);
        }

        return this.isSignedIn();
    }

    //
    // Update signedin state.
    //
    private async updateSignedinState(authToken: string | undefined, id: string | undefined): Promise<void> {
        if (authToken === undefined) {
            localStorage.removeItem("t");
        }
        else {
            localStorage.setItem("t", authToken);
        }
        
        this.authToken = authToken;
        this.signedInCheck = true;
        if (id !== undefined && authToken !== undefined) {
            await this.onSignedIn.raise();
        }
        else {
            await this.onSignedOut.raise();
        }

        await this.onSigninCheckCompleted.raise();
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
        const response = await axios.post(BASE_URL + "/api/auth/authenticate", {
            email: email,
            password: password,
        });

        if (response.data.ok) {
            await this.updateSignedinState(response.data.token, response.data.id);
        }
        else {
            await this.updateSignedinState(undefined, undefined);
        }

        return response.data;
    }

    //
    // Sign a user out.
    //
    async signout(): Promise<void> {
        this.updateSignedinState(undefined, undefined);
    }

    //
    // Register a new user.
    //
    async register(email: string, password: string): Promise<IAuthResponse> {
        const response = await axios.post(BASE_URL + "/api/auth/register", {
            email,
            password,
        });

        return response.data;
    }

    //
    // Resend a confirmation email to an unconfirmed user.
    //
    async resendConfirmationEmail(email: string): Promise<void> {
        await axios.post(BASE_URL + "/api/auth/resend-confirmation-email", {
            email: email,
        });
    }

    //
    // Request a password reset for a user.
    //
    async requestPasswordReset(email: string): Promise<void> {
        await axios.post(BASE_URL + "/api/auth/request-password-reset", {
            email: email,
        });
    }

    //
    // Set a user's password to a new value.
    //
    async resetPassword(email: string, password: string, token: string): Promise<IAuthResponse> {
        const response = await axios.post(BASE_URL + "/api/auth/reset-password", {
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
        await this.post("/api/auth/update-password", {
            password: password,
        });
    }
    
    //
    // Confirm user's account.
    //
    async confirm(email: string, token: string): Promise<IAuthResponse> {
        const response = await axios.post(BASE_URL + "/api/auth/confirm", {
            email: email,
            token: token,
        });

        return response.data;
    }

    //
    // Create the Axios configuration object.
    //
    private makeConfiguration(config?: AxiosRequestConfig): AxiosRequestConfig {
        if (!config) {
            config = {};
        }
        else {
            config = Object.assign({}, config); // Clone so as not to modify original.
        }

        if (this.authToken) {
    
            if (!config.headers) {
                config.headers = {};
            }
    
            config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        return config;
    }

    //
    // Make an authenticated HTTP GET request and return the response.
    //
    async get<T>(route: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const modifiedConfig = this.makeConfiguration(config);
        try {
            return await axios.get(BASE_URL + route, modifiedConfig);
        }
        catch (err) {
            if (err.response && err.response.status === 401) {
                // Token has expired, no longer authenticated.
                this.updateSignedinState(undefined, undefined);
            }
            throw err;
        }
    }

    //
    // Make an authenticated HTTP POST request and return the response.
    //
    async post<T = any>(route: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const modifiedConfig = this.makeConfiguration(config);
        try {
            return await axios.post(BASE_URL + route, data, modifiedConfig);
        }
        catch (err) {
            if (err.response && err.response.status === 401) {
                // Token has expired, no longer authenticated.
                this.updateSignedinState(undefined, undefined);
            }
            throw err;
        }
    }

    //
    // Make an authenticated HTTP PUT request and return the response.
    //
    async put<T = any>(route: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        const modifiedConfig = this.makeConfiguration(config);
        try {
            return await axios.put(BASE_URL + route, data, modifiedConfig);
        }
        catch (err) {
            if (err.response && err.response.status === 401) {
                // Token has expired, no longer authenticated.
                this.updateSignedinState(undefined, undefined);
            }
            throw err;
        }
    }

    //
    // Create an authenticated version of a URL.
    //
    makeAuthenticatedUrl(baseUrl: string, params?: any): string {
        if (!params) {
            params = { t: this.authToken };
        }
        else {
            params = Object.assign({}, params, { t: this.authToken });
        }

        let first = true;
        let url = BASE_URL + baseUrl;

        for (const key of Object.keys(params)) {
            if (first) {
                first = false;
                url += `?`;
            }
            else {
                url += '&';
            }

            url += `${key}=${params[key]}`;
        }

        return url;
    }
}
