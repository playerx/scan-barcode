import {
  AfterViewInit,
  Component,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ModalController,
  NavController,
  ToastController,
} from '@ionic/angular';

@Component({
  selector: 'app-email-verification',
  templateUrl: './email-verification.page.html',
  styleUrls: ['./email-verification.page.scss'],
})
export class EmailVerificationPage implements OnInit, AfterViewInit {
  @Input()
  skipInitLogic: boolean;

  @Input()
  onSuccess: () => void;

  @Input()
  showCloseButton: boolean;

  @Input()
  gameId: string;

  @Input()
  isMobileApp: boolean;

  @ViewChild('EmailInput', { static: false }) emailInput: {
    setFocus: () => void;
  };

  isVerifyMode: boolean;
  email: string;
  code: string;
  isGlobalLoading: boolean;
  isLoading: boolean;

  mode: 'EMAIL_ADD' | 'LOGIN' | 'EMAIL_UPDATE';

  get isEmailAddMode() {
    return this.mode === 'EMAIL_ADD';
  }

  get isEmailUpdateMode() {
    return this.mode === 'EMAIL_UPDATE';
  }

  get isLoginMode() {
    return this.mode === 'LOGIN';
  }

  constructor(
    private nav: NavController,
    private toast: ToastController,
    private route: ActivatedRoute,
    private modal: ModalController
  ) {}

  async ngOnInit() {
    this.isVerifyMode = false;

    if (this.skipInitLogic) {
      return;
    }

    this.mode =
      <any>this.route.snapshot.queryParamMap.get('mode') || 'EMAIL_ADD';

    this.route.queryParamMap.subscribe(async (x) => {
      const code = x.get('code');
      const email = x.get('email');

      if (!code || !email) {
        return;
      }

      this.mode = 'LOGIN';
      this.code = code;
      this.email = email;

      console.log('EmailVerification Received:', email, code);

      try {
        this.isGlobalLoading = true;

        // this.user.skipNextGuestNotification()

        await this.setCorrectMode();

        await this.complete();
      } catch (err: any) {
        this.handleError(err);
      } finally {
        this.isGlobalLoading = false;
        this.code = '';
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.emailInput.setFocus();
    }, 800);
  }

  async sendVerification() {
    try {
      this.isLoading = true;

      await this.setCorrectMode();

      // await this.graph.mutation.emailVerificationRequest({
      //   email: this.email,
      //   name: this.user.data.nickname,
      //   templateVersion: 'v2',
      //   gameId: this.gameId,
      // });

      this.isVerifyMode = true;
    } catch (err: any) {
      this.handleError(err);
    } finally {
      this.isLoading = false;
    }
  }

  close() {
    this.modal.dismiss();
  }

  private async setCorrectMode() {
    switch (this.mode) {
      case 'EMAIL_UPDATE':
      case 'EMAIL_ADD':
        {
          // const exists = await this.graph.mutation.checkUserEmail({
          //   email: this.email,
          // });
          // if updating the email and it already exists in the system
          // process should be stopped
          // if (exists && this.mode === 'EMAIL_UPDATE') {
          //   this.showInfo('Another user has already used this Email');
          //   return;
          // }
          // // if email is already used, switch to login mode
          // // only when adding new email
          // if (exists && this.mode === 'EMAIL_ADD') {
          //   this.mode = 'LOGIN';
          // }
        }
        break;

      case 'LOGIN':
        {
          // const exists = await this.graph.mutation.checkUserEmail({
          //   email: this.email,
          // });
          // if email is already used, switch to login mode
          // if (!exists) {
          //   this.mode = 'EMAIL_ADD';
          // }
        }
        break;
    }
  }

  async complete() {
    try {
      this.isLoading = true;

      // await this.graph.mutation.emailVerificationComplete({
      //   email: this.email,
      //   code: (this.code || '').toString(),
      // });

      switch (this.mode) {
        case 'EMAIL_ADD':
        case 'EMAIL_UPDATE':
          {
            // await this.user.setEmail(this.email);

            this.nav.navigateBack('/', { animationDirection: 'back' });
            // navigateBack(this.routerOutlet, this.nav, null)

            const isMailUpdate = this.mode === 'EMAIL_UPDATE';

            this.toast
              .create({
                message: isMailUpdate
                  ? 'Email is changed successfully'
                  : 'Email is verified successfully',
                position: 'top',
                duration: 1500,
              })
              .then((x) => x.present());

            // this.user.refresh();
          }
          break;

        case 'LOGIN':
          {
            // await this.user.loginByEmail(this.email);

            this.nav.navigateBack('/', { animationDirection: 'back' });
            // navigateBack(this.routerOutlet, this.nav, null)
          }
          break;
      }

      if (this.onSuccess) {
        this.onSuccess();
      }
    } catch (err: any) {
      this.handleError(err);
    } finally {
      this.isLoading = false;
    }
  }

  onEmailKeyUp(e: KeyboardEvent) {
    if (e.keyCode === 13) {
      if (!this.email) {
        return;
      }

      this.sendVerification();
    }
  }

  onCodeKeyUp(e: KeyboardEvent) {
    if (e.keyCode === 13) {
      if (!this.code) {
        return;
      }

      this.complete();
    }
  }

  // openMailbox() {
  //   const { JokHelper } = Plugins;

  //   JokHelper.openMailbox().catch(console.error);
  // }

  showInfo(message: string) {
    this.toast
      .create({
        message,
        position: 'top',
        duration: 1500,
      })
      .then((x) => x.present());
  }

  handleError(err) {
    this.toast
      .create({
        message: err.message,
        color: 'warning',
        position: 'top',
        duration: 1500,
      })
      .then((x) => x.present());
  }
}
