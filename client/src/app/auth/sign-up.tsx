    import * as React from 'react';
import { Container } from '../../components/container';
import { FormGroup, InputGroup, AnchorButton, Button, Checkbox, Intent, Overlay, Classes, Card, Divider, Icon } from '@blueprintjs/core';
import { Link, Redirect } from 'react-router-dom';
import { IAuthentication, Authentication } from '../../services/authentication';
import { asyncHandler } from '../../utils/async-handler';
import { updateState } from '../../utils/update-state';
import { validateEmail } from '../../utils/validate-email';
import { Row } from '../../components/row';
import { Spacer } from '../../components/spacer';
import { terms, privacy } from '../legals';

export interface ISignUpProps {
}

export interface ISignUpState {
    signedin: boolean;
    signedup: boolean;
    validated: boolean;
    errorMessage?: string;
    working: boolean;
    emailAddress: string;
    password: string;
    confirmPassword: string;
    acceptedTerms: boolean;
    showTerms: boolean;
    showPrivacy: boolean;
}

export class SignUpUI extends React.Component<ISignUpProps, ISignUpState> {

    authentication: IAuthentication = Authentication.getInstance(); //TODO: DI.

    constructor(props: ISignUpProps) {
        super(props);

        this.state = {
            signedin: false,
            signedup: false,
            validated: false,
            working: false,
            emailAddress: "",
            password: "",
            confirmPassword: "",
            acceptedTerms: false,
            showTerms: false,
            showPrivacy: false,
        };

        this.componentDidMount = asyncHandler(this, this.componentDidMount);
        this.onEmailInputChange = asyncHandler(this, this.onEmailInputChange);
        this.onPasswordInputChange = asyncHandler(this, this.onPasswordInputChange);
        this.onConfirmPasswordInputChange = asyncHandler(this, this.onConfirmPasswordInputChange);
        this.onAcceptedTerms = asyncHandler(this, this.onAcceptedTerms);
        this.onShowTerms = asyncHandler(this, this.onShowTerms);
        this.onCloseTerms = asyncHandler(this, this.onCloseTerms);
        this.onShowPrivacy = asyncHandler(this, this.onShowPrivacy);
        this.onClosePrivacy = asyncHandler(this, this.onClosePrivacy);
        this.onSignUpClick = asyncHandler(this, this.onSignUpClick);
    }

    async componentDidMount(): Promise<void> {
        console.log("Checking for signin!");
        const isSignedin = await this.authentication.isSignedIn();
        console.log("Signed in: " + isSignedin);

        if (isSignedin != this.state.signedin) {
            await updateState(this, { signedin: isSignedin });
        }
    }

    private isValid(): boolean {
        return this.state.acceptedTerms
            && this.state.emailAddress.length > 0 
            && this.state.password.length > 0
            && this.state.confirmPassword.length > 0
            && this.state.password === this.state.confirmPassword 
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

    private async onConfirmPasswordInputChange(event: React.FormEvent<HTMLInputElement>): Promise<void> {
        await updateState(this, { confirmPassword: event.currentTarget.value });
        await this.validate();
    }

    async onAcceptedTerms(event: React.FormEvent<HTMLInputElement>): Promise<void> {
        await updateState(this, { acceptedTerms: event.currentTarget.checked });
        await this.validate();
    }

    async onShowTerms(): Promise<void> {
        await updateState(this, { showTerms: true });
    }

    async onCloseTerms(): Promise<void> {
        await updateState(this, { showTerms: false });
    }
    
    async onShowPrivacy(): Promise<void> {
        await updateState(this, { showPrivacy: true });
    }

    async onClosePrivacy(): Promise<void> {
        await updateState(this, { showPrivacy: false });
    }
    
    async onSignUpClick(): Promise<void> {
        try {
            await updateState(this, { working: true });
            const result = await this.authentication.register(this.state.emailAddress, this.state.password);
            if (result.ok) {
                await updateState(this, { signedup: true });
            }
            else {
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
        if (this.state.signedin) {
            // Already signed in.
            return <Redirect to="/" />;
        }

        if (this.state.signedup) {
            // Signup successful. Await confirmation.
            return <Redirect to={"/auth/confirm-signup/" + this.state.emailAddress} />;
        }

        return (
            <Container
                maxWidth="400px"
                >
                <div className="mt-8 text-center">
                    <p className="mt-8">Logo here</p>
                    <h1 className="mt-2">Text</h1>
                    <p className="mt-1">Subtext</p>
                </div>

                <div className="border border-grey rounded-sm mt-8 p-4">

                    <p>Explanation text goes here</p>

                    <div className="mt-8">
                        <FormGroup
                            label={"Email"}
                            labelFor="email-input"
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
                            helperText="Minimum 8 characters"
                            >
                            <InputGroup 
                                id="password-input" 
                                large
                                leftIcon="lock"
                                rightElement={
                                    <Button
                                        icon="eye-open" 
                                        minimal
                                        />
                                }
                                placeholder="Choose a password" 
                                onChange={this.onPasswordInputChange}
                                required
                                type="password"
                                />
                        </FormGroup>
                    </div>

                    <div className="mt-4">
                        <FormGroup
                            label={"Confirm Password"}
                            labelFor="password-confirm-input"
                            >
                            <InputGroup 
                                id="password-confirm-input" 
                                large
                                leftIcon="confirm"
                                rightElement={
                                    <Button
                                        icon="eye-open" 
                                        minimal={true}
                                        />
                                }
                                placeholder="Confirm your password" 
                                onChange={this.onConfirmPasswordInputChange}
                                required
                                type="password"
                                />
                        </FormGroup>
                    </div>

                    <div className="mt-4">TODO: captcha here</div>

                    <div className="mt-8 mb-8">
                        <Row>
                            <Spacer max />

                            <Checkbox 
                                label="I have read and I accept the terms and conditions and privacy policy" 
                                onChange={this.onAcceptedTerms} 
                                large
                                />
                        </Row>
                        <Row>
                            <Spacer max />
                            <Button
                                minimal
                                onClick={this.onShowTerms}
                                >
                                Read terms and conditions
                            </Button>
                            &nbsp;
                            |
                            &nbsp;
                            <Button
                                minimal
                                onClick={this.onShowPrivacy}
                                >
                                Read privacy policy
                            </Button>
                        </Row>
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
                        id="sign-up-btn"
                        className="mt-4" 
                        intent="primary"
                        large
                        style={{
                            width: "100%",
                        }}
                        onClick={this.onSignUpClick}
                        disabled={!this.state.validated || this.state.working}
                        loading={this.state.working}
                        >
                        SIGN UP
                    </Button>
                    
                    <p className="mt-8">Already have an account? <Link to="/auth/signin">Sign in</Link></p>
                </div>
                <Overlay 
                    isOpen={this.state.showTerms} 
                    onClose={this.onCloseTerms}
                    className={Classes.OVERLAY_SCROLL_CONTAINER}
                    >
                    <div
                        style={{
                            width: "100%",
                        }}
                        >
                        <Container 
                            width="90%"
                            maxWidth="700px"
                            >
                            <Card 
                                className="mt-8"
                                elevation={4}
                                >
                                <h1>Website Terms and Conditions of Use</h1>
                                <Divider />
                                <p>Coinstash Pty Ltd</p>
                                {terms}
                                <br />
                                <Row>
                                    <Spacer max />
                                    <Button intent={Intent.PRIMARY} onClick={this.onCloseTerms}>
                                        Close
                                    </Button>
                                </Row>
                            </Card>
                        </Container>
                    </div>
                </Overlay>
                <Overlay 
                    isOpen={this.state.showPrivacy} 
                    onClose={this.onClosePrivacy}
                    className={Classes.OVERLAY_SCROLL_CONTAINER}
                    >
                    <div
                        style={{
                            width: "100%",
                        }}
                        >
                        <Container 
                            width="90%"
                            maxWidth="700px"
                            >
                            <Card 
                                className="mt-8"
                                elevation={4}
                                >
                                <h1>Privacy policy</h1>
                                <Divider />
                                <p>Coinstash Pty Ltd</p>
                                {privacy}
                                <br />
                                <Row>
                                    <Spacer max />
                                    <Button 
                                        intent={Intent.PRIMARY} 
                                        onClick={this.onClosePrivacy}
                                        icon="cross"
                                        >
                                        Close
                                    </Button>
                                </Row>
                            </Card>
                        </Container>
                    </div>
                </Overlay>                
            </Container>
        );
    }
}