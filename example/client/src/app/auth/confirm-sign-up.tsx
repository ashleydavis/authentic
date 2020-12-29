import * as React from 'react';
import { Container } from '../../components/container';
import { Button } from "@blueprintjs/core";
import { Link, RouteComponentProps } from 'react-router-dom';
import { IAuthentication, Authentication } from '../../services/authentication';
import { asyncHandler } from '../../utils/async-handler';
import { updateState } from '../../utils/update-state';

export interface IConfirmSignUpPropsParams {
    //
    // The email that confirmation was sent to.
    //
    emailAddress: string;
}

export interface IConfirmSignUpProps extends RouteComponentProps<IConfirmSignUpPropsParams>  {
}

export interface IConfirmSignUpState {
    working: boolean;
}

export class ConfirmSignUpUI extends React.Component<IConfirmSignUpProps, IConfirmSignUpState> {

    authentication: IAuthentication = Authentication.getInstance(); //TODO: DI.
    
    constructor(props: IConfirmSignUpProps) {
        super(props);

        this.state = {
            working: false,
        };

        this.onClickResendEmail = asyncHandler(this, this.onClickResendEmail);
    }

    private async onClickResendEmail () {
        try {
            await updateState(this, { working: true });
            await this.authentication.resendConfirmationEmail(this.props.match.params.emailAddress);
        }
        finally {
            await updateState(this, { working: false });
        }
    }

    render() {
        return (
            <Container
                maxWidth="400px"
                >
                <div className="mt-8 text-center">
                    <p className="mt-8">Email image here</p>
                    <h1 className="mt-2">Please confirm your email address</h1>
                    {this.props.match.params.emailAddress
                        && <p className="mt-1">An email was sent to {this.props.match.params.emailAddress}</p>
                    }
                </div>

                <div className="mt-8 p-4 text-center">

                    <Button 
                        id="resend-confirmation-email"
                        className="mt-8" 
                        large
                        onClick={this.onClickResendEmail}
                        disabled={this.state.working}
                        loading={this.state.working}
                        >
                        RESEND THE EMAIL
                    </Button>
                    
                    <p className="mt-8"><Link to="/auth/signup">Sign up</Link> with a different email address</p>
                </div>
               
            </Container>
        );
    }
}