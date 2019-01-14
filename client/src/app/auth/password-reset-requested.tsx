import * as React from 'react';
import { Container } from '../../components/container';
import { FormGroup, InputGroup, Icon, Button, AnchorButton } from "@blueprintjs/core";
import { Column } from '../../components/column';
import { Link, RouteComponentProps } from 'react-router-dom';
import { IAuthentication, Authentication } from '../../services/authentication';
import { asyncHandler } from '../../utils/async-handler';
import { updateState } from '../../utils/update-state';

export interface IPasswordResetRequestedPropsParams {
    //
    // The email that confirmation was sent to.
    //
    emailAddress: string;
}

export interface IPasswordResetRequestedProps extends RouteComponentProps<IPasswordResetRequestedPropsParams>  {
}

export interface IPasswordResetRequestedState {
    working: boolean;
}

export class PasswordResetRequestedUI extends React.Component<IPasswordResetRequestedProps, IPasswordResetRequestedState> {

    authentication: IAuthentication = Authentication.getInstance(); //TODO: DI.
    
    constructor(props: IPasswordResetRequestedProps) {
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
                    <h1 className="mt-2">You have been sent a password reset email</h1>
                    {this.props.match.params.emailAddress
                        && <p className="mt-1">An email was sent to {this.props.match.params.emailAddress}</p>
                    }
                </div>

                <div className="mt-8 p-4 text-center">
                    <p> 
                    Didn't work? Please check your spam.
                    </p>


                    <p>
                    Or <Link to="/auth/forgot-password">request another reset email</Link>.
                    </p>
                </div>
               
            </Container>
        );
    }
}