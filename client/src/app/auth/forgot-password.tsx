import * as React from 'react';
import { Container } from '../../components/container';
import { FormGroup, InputGroup, Icon, Button, AnchorButton } from "@blueprintjs/core";
import { Column } from '../../components/column';
import { Link, Redirect } from 'react-router-dom';
import { updateState } from '../../utils/update-state';
import { asyncHandler } from '../../utils/async-handler';
import { validateEmail } from '../../utils/validate-email';
import { IAuthentication, Authentication } from '../../services/authentication';

export interface IForgotPasswordProps {
}

export interface IForgotPasswordState {
    requested: boolean;
    validated: boolean;
    working: boolean;
    emailAddress: string;
}

export class ForgotPasswordUI extends React.Component<IForgotPasswordProps, IForgotPasswordState> {

    authentication: IAuthentication = Authentication.getInstance(); //TODO: DI.
    
    constructor(props: IForgotPasswordProps) {
        super(props);

        this.state = {
            requested: false,
            validated: false,
            working: false,
            emailAddress: "",
        };

        this.componentDidMount = asyncHandler(this, this.componentDidMount);
        this.onEmailInputChange = asyncHandler(this, this.onEmailInputChange);
        this.onSubmitClick = asyncHandler(this, this.onSubmitClick);
    }

    async componentDidMount(): Promise<void> {
    }

    private isValid(): boolean {
        return this.state.emailAddress.length > 0 
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

    async onSubmitClick(): Promise<void> {
        try {
            await updateState(this, { working: true });
            await this.authentication.requestPasswordReset(this.state.emailAddress);
            await updateState(this, { requested: true });
        }
        catch (err) {
            await updateState(this, { working: false });
            throw err;
        }
    }
    
    render() {
        if (this.state.requested) {
            // PW reset requested. Tell the user to check their email.
            return <Redirect to={"/auth/password-reset-requested/" + this.state.emailAddress} />;
        }

        return (
            <Container
                maxWidth="400px"
                >
                <div className="text-center">
                    <p className="mt-8">Logo here</p>
                    <h1 className="mt-2">Text</h1>
                    <p className="mt-1">Subtext</p>
                </div>

                <div className="border border-grey rounded-sm mt-8 p-4">

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

                    <div className="mt-4">TODO: captcha here</div>

                    <Button
                        id="request-pw-reset-btn"
                        className="mt-4" 
                        intent="primary"
                        large
                        style={{
                            width: "100%",
                        }}
                        onClick={this.onSubmitClick}
                        disabled={!this.state.validated || this.state.working}
                        loading={this.state.working}
                        >
                        REQUEST PASSWORD RESET
                    </Button>
                    
                    <p className="mt-8">Already have an account? <Link to="/auth/signin">Sign in</Link></p>
                    <p className="mt-4">Don't have an account? <Link to="/auth/signup">Sign up</Link></p>
                </div>
            </Container>
        );
    }
}