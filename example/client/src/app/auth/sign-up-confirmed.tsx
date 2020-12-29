import * as React from 'react';
import { Container } from '../../components/container';
import { FormGroup, InputGroup, Icon, Button } from "@blueprintjs/core";
import { Redirect, RouteComponentProps } from 'react-router-dom';
import { updateState } from '../../utils/update-state';
import { asyncHandler } from '../../utils/async-handler';
import { IAuthentication, Authentication } from '../../services/authentication';
import { validateEmail } from '../../utils/validate-email';

export interface ISignUpConfirmedPropsParams {
    //
    // Confirmation code passed as query parameter to URL.
    //
    confirmationToken?: string;
}

export interface ISignUpConfirmedProps extends RouteComponentProps<ISignUpConfirmedPropsParams>  {
}

export interface ISignUpConfirmedState {
    signedin: boolean;
    validated: boolean;
    errorMessage?: string;
    working: boolean;
    emailAddress: string,
    confirmationToken: string;
    confirmed: boolean;
}

export class SignUpConfirmedUI extends React.Component<ISignUpConfirmedProps, ISignUpConfirmedState> {

    authentication: IAuthentication = Authentication.getInstance(); //TODO: DI.

    constructor(props: ISignUpConfirmedProps) {
        super(props);

        const params = new URLSearchParams(this.props.location.search);
        const inputEmail = params.get("email");

        this.state = {
            signedin: false,
            validated: false,
            working: false,
            emailAddress: inputEmail || "",
            confirmationToken: this.props.match.params.confirmationToken || "",
            confirmed: false,
        };

        this.componentDidMount = asyncHandler(this, this.componentDidMount);
        this.onEmailInputChange = asyncHandler(this, this.onEmailInputChange);
        this.onConfirmationTokenChange = asyncHandler(this, this.onConfirmationTokenChange);
        this.onConfirmClick = asyncHandler(this, this.onConfirmClick);
    }

    async componentDidMount(): Promise<void> {
        console.log("Checking for signin!");
        const isSignedin = await this.authentication.isSignedIn();
        console.log("Signed in: " + isSignedin);

        await this.validate();

        if (isSignedin != this.state.signedin) {
            await updateState(this, { signedin: isSignedin });
        }
    }

    private isValid(): boolean {
        return this.state.emailAddress.length > 0 
            && this.state.confirmationToken.length > 0
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

    private async onConfirmationTokenChange(event: React.FormEvent<HTMLInputElement>): Promise<void> {
        await updateState(this, { confirmationToken: event.currentTarget.value });
        await this.validate();
    }

    async onConfirmClick(): Promise<void> {
        try {
            await updateState(this, { working: true });
            const result = await this.authentication.confirm(this.state.emailAddress, this.state.confirmationToken);
            if (result.ok) {
                await updateState(this, { confirmed: true });
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

        if (this.state.confirmed) {
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
                            label={"Confirmation token"}
                            labelFor="confirmation-token"
                            helperText="Enter the string of numbers that was emailed to you" 
                            >
                            <InputGroup 
                                id="confirmation-token" 
                                large
                                leftIcon="lock"
                                placeholder="Enter your account confirmation token" 
                                value={this.state.confirmationToken}
                                onChange={this.onConfirmationTokenChange}
                                required
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
                        id="confirm-btn"
                        className="mt-4" 
                        intent="primary"
                        large
                        style={{
                            width: "100%",
                        }}
                        onClick={this.onConfirmClick}
                        disabled={!this.state.validated || this.state.working}
                        loading={this.state.working}
                        >
                        CONFIRM YOUR ACCOUNT
                    </Button>
                </div>
           </Container>
         );
    }
}