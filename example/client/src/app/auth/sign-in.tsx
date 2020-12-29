import * as React from 'react';
import { Container } from '../../components/container';
import { FormGroup, InputGroup, Icon, Button } from "@blueprintjs/core";
import { Link, Redirect } from 'react-router-dom';
import { IAuthentication, Authentication } from '../../services/authentication';
import { updateState } from '../../utils/update-state';
import { validateEmail } from '../../utils/validate-email';
import { asyncHandler } from '../../utils/async-handler';

export interface ISignInProps {
}

export interface ISignInState {
    validated: boolean;
    errorMessage?: string;
    working: boolean;
    emailAddress: string,
    password: string;
}

export class SignInUI extends React.Component<ISignInProps, ISignInState> {

    authentication: IAuthentication = Authentication.getInstance(); //TODO: DI.
    
    constructor(props: ISignInProps) {
        super(props);

        this.state = {
            validated: false,
            working: false,
            emailAddress: "",
            password: "",
        };

        this.onSignedIn = this.onSignedIn.bind(this);
        this.onEmailInputChange = asyncHandler(this, this.onEmailInputChange);
        this.onPasswordInputChange = asyncHandler(this, this.onPasswordInputChange);
        this.onSignInClick = asyncHandler(this, this.onSignInClick);
    }
    
    componentDidMount() {
        this.authentication.onSignedIn.attach(this.onSignedIn);
    }

    componentWillUnmount() {
        this.authentication.onSignedIn.detach(this.onSignedIn);
    }

    onSignedIn() {
        this.forceUpdate();
    }

    private isValid(): boolean {
        return this.state.emailAddress.length > 0 
            && this.state.password.length > 0
            && validateEmail(this.state.emailAddress);
    }

    private async validate(): Promise<void> {
        await updateState(this, {
            validated: this.isValid(),
        });        
    }
        
    private async onEmailInputChange(event: React.FormEvent<HTMLInputElement>): Promise<void> {
        await updateState(this, { emailAddress: event.currentTarget.value });
        await this.validate();
    }

    private async onPasswordInputChange(event: React.FormEvent<HTMLInputElement>): Promise<void> {
        await updateState(this, { password: event.currentTarget.value });
        await this.validate();
    }
    
    async onSignInClick(): Promise<void> {
        try {
            await updateState(this, { working: true });
            const result = await this.authentication.signin(this.state.emailAddress, this.state.password);
            if (!result.ok) {
                await updateState(this, { 
                    working: false,
                    errorMessage: result.errorMessage || "An error occurred" 
                });
            }
        }
        catch (err) {
            await updateState(this, { working: false });
            throw err;
        }
    }

    render() {
        if (this.authentication.isSignedIn()) {
            // Already signed in.
            return <Redirect to="/" />;
        }

        return (
            <Container
                maxWidth="400px"
                >
                <div className="mt-8 text-center">
                    <p className="mt-8">Amazing logo goes here</p>
                    <h1 className="mt-2">Text</h1>
                    <p className="mt-1">Subtext</p>
                </div>

                <div className="border border-grey rounded-sm mt-8 p-4">
                    
                    <p>Explanation text</p>

                    <div className="mt-8">
                        <FormGroup
                            label={"Email"}
                            labelFor="email-input"
                            className="mt-8"
                            >
                            <InputGroup 
                                id="email-input" 
                                large
                                leftIcon="envelope"
                                placeholder="Enter your email address" 
                                onChange={this.onEmailInputChange}
                                required
                                autoFocus
                                />
                        </FormGroup>
                    </div>

                    <div className="mt-4">
                        <FormGroup
                            label={"Password"}
                            labelFor="password-input"
                            >
                            <InputGroup 
                                id="password-input" 
                                large
                                leftIcon="lock"
                                rightElement={
                                    <Button
                                        icon="eye-open" 
                                        minimal={true}
                                        />
                                }
                                placeholder="Enter your password" 
                                onChange={this.onPasswordInputChange}
                                required
                                type="password"
                                />
                        </FormGroup>
                    </div>

                    {this.state.errorMessage
                        && <div className="bp3-toast bp3-intent-danger">
                            <Icon icon="error" />
                            <div className="bp3-toast-message">
                                {this.state.errorMessage}
                            </div>
                        </div>
                    }

                    <Button 
                        id="sign-in-btn"
                        className="mt-8" 
                        intent="primary"
                        large
                        style={{
                            width: "100%",
                        }}
                        onClick={this.onSignInClick}
                        disabled={!this.state.validated || this.state.working}
                        loading={this.state.working}
                        >
                        SIGN IN
                    </Button>
                    
                    <p className="mt-8">Don't have an account? <Link to="/auth/signup">Sign up</Link></p>
                    <p className="mt-4"><Link to="/auth/forgot-password">Forgotten password?</Link></p>
                </div>
            </Container>
        );
    }
}