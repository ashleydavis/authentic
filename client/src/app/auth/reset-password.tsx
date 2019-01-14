import * as React from 'react';
import { Container } from '../../components/container';
import { FormGroup, InputGroup, Icon, Button, AnchorButton } from "@blueprintjs/core";
import { Column } from '../../components/column';
import { Link, Redirect, RouteComponentProps } from 'react-router-dom';
import { updateState } from '../../utils/update-state';
import { asyncHandler } from '../../utils/async-handler';
import { IAuthentication, Authentication } from '../../services/authentication';
import { validateEmail } from '../../utils/validate-email';

export interface IResetPasswordConfirmedPropsParams {
    //
    // PW reset token passed as query parameter to URL.
    //
    passwordResetToken?: string;
}

export interface IResetPasswordConfirmedProps extends RouteComponentProps<IResetPasswordConfirmedPropsParams>  {
}

export interface IResetPasswordConfirmedState {
    validated: boolean;
    errorMessage?: string;
    working: boolean;
    emailAddress: string,
    passwordResetToken: string;
    passwordReset: boolean;
    password: string;
    confirmPassword: string;
}

export class ResetPasswordUI extends React.Component<IResetPasswordConfirmedProps, IResetPasswordConfirmedState> {

    authentication: IAuthentication = Authentication.getInstance(); //TODO: DI.

    constructor(props: IResetPasswordConfirmedProps) {
        super(props);

        const params = new URLSearchParams(this.props.location.search);
        const inputEmail = params.get("email");

        this.state = {
            validated: false,
            working: false,
            emailAddress: inputEmail || "",
            passwordResetToken: this.props.match.params.passwordResetToken || "",
            passwordReset: false,
            password: "",
            confirmPassword: "",
        };

        this.componentDidMount = asyncHandler(this, this.componentDidMount);
        this.onEmailInputChange = asyncHandler(this, this.onEmailInputChange);
        this.onPasswordResetTokenChange = asyncHandler(this, this.onPasswordResetTokenChange);
        this.onPasswordInputChange = asyncHandler(this, this.onPasswordInputChange);
        this.onConfirmPasswordInputChange = asyncHandler(this, this.onConfirmPasswordInputChange);
        this.onUpdatePasswordClick = asyncHandler(this, this.onUpdatePasswordClick);
    }

    async componentDidMount(): Promise<void> {
    }

    private isValid(): boolean {
        return this.state.emailAddress.length > 0
            && this.state.passwordResetToken.length > 0
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

    private async onPasswordResetTokenChange(event: React.FormEvent<HTMLInputElement>): Promise<void> {
        await updateState(this, { passwordResetToken: event.currentTarget.value });
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

    async onUpdatePasswordClick(): Promise<void> {
        try {
            await updateState(this, { working: true });
            const result = await this.authentication.resetPassword(this.state.emailAddress, this.state.password, this.state.passwordResetToken);
            if (result.ok) {
                await updateState(this, { passwordReset: true });
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
        if (this.state.passwordReset) {
            // Confirmed, now sign in.
            return <Redirect to="/auth/signin" />;
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

                    <p>Explanation text</p>

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
                                value={this.state.emailAddress}
                                onChange={this.onEmailInputChange}
                                required
                                autoFocus
                                />
                        </FormGroup>
                    </div>

                    <div className="mt-4">
                        <FormGroup
                            label={"Password reset token"}
                            labelFor="password-reset-token"
                            helperText="Enter the string of numbers that was emailed to you" 
                            >
                            <InputGroup 
                                id="password-reset-token"
                                large
                                leftIcon="shield"
                                placeholder="Enter your password reset token" 
                                value={this.state.passwordResetToken}
                                onChange={this.onPasswordResetTokenChange}
                                required
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
                                placeholder="Choose a new password" 
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

                    {this.state.errorMessage
                        && <div className="bp3-toast bp3-intent-danger">
                            <Icon icon="error" />
                            <div className="bp3-toast-message">
                                {this.state.errorMessage}
                            </div>
                        </div>
                    }

                    <Button
                        id="update-password-btn"
                        className="mt-4" 
                        intent="primary"
                        large
                        style={{
                            width: "100%",
                        }}
                        onClick={this.onUpdatePasswordClick}
                        disabled={!this.state.validated || this.state.working}
                        loading={this.state.working}
                        >
                        UPDATE YOUR PASSWORD
                    </Button>
                </div>
           </Container>
         );
    }
}