export type Locale = "en" | "es"

export const locales: Locale[] = ["en", "es"]

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
}

export type TranslationKeys = {
  // Common
  "common.loading": string
  "common.error": string
  "common.success": string
  "common.cancel": string
  "common.save": string
  "common.delete": string
  "common.edit": string
  "common.back": string
  "common.next": string
  "common.submit": string
  "common.search": string
  "common.noResults": string
  "common.close": string

  // Auth/Login
  "login.title": string
  "login.subtitle": string
  "login.emailLabel": string
  "login.emailPlaceholder": string
  "login.passwordLabel": string
  "login.passwordPlaceholder": string
  "login.signIn": string
  "login.signingIn": string
  "login.forgotPassword": string
  "login.noAccount": string
  "login.signUp": string
  "login.termsPrefix": string
  "login.termsLink": string
  "login.termsMiddle": string
  "login.privacyLink": string
  "login.allRightsReserved": string

  // Header
  "header.dashboard": string
  "header.newReview": string
  "header.notifications": string
  "header.profile": string
  "header.settings": string
  "header.signOut": string
  "header.toggleTheme": string
  "header.toggleLanguage": string

  // Dashboard
  "dashboard.title": string
  "dashboard.subtitle": string
  "dashboard.newReview": string
  "dashboard.recentReviews": string
  "dashboard.viewAll": string
  "dashboard.noReviews": string
  "dashboard.noReviewsDescription": string
  "dashboard.startFirstReview": string
  "dashboard.totalReviews": string
  "dashboard.activeReviews": string
  "dashboard.completedReviews": string
  "dashboard.avgScore": string
  "dashboard.searchPlaceholder": string
  "dashboard.filterAll": string
  "dashboard.filterActive": string
  "dashboard.filterCompleted": string
  "dashboard.sortNewest": string
  "dashboard.sortOldest": string
  "dashboard.sortHighScore": string
  "dashboard.sortLowScore": string

  // New Review
  "newReview.title": string
  "newReview.subtitle": string
  "newReview.step1Title": string
  "newReview.step1Description": string
  "newReview.step2Title": string
  "newReview.step2Description": string
  "newReview.step3Title": string
  "newReview.step3Description": string
  "newReview.projectName": string
  "newReview.projectNamePlaceholder": string
  "newReview.description": string
  "newReview.descriptionPlaceholder": string
  "newReview.uploadDocuments": string
  "newReview.uploadDescription": string
  "newReview.dragDrop": string
  "newReview.browseFiles": string
  "newReview.supportedFormats": string
  "newReview.selectFramework": string
  "newReview.selectFrameworkDescription": string
  "newReview.reviewType": string
  "newReview.startReview": string
  "newReview.previous": string
  "newReview.continue": string

  // Processing
  "processing.title": string
  "processing.subtitle": string
  "processing.analyzing": string
  "processing.step1": string
  "processing.step2": string
  "processing.step3": string
  "processing.step4": string
  "processing.estimatedTime": string
  "processing.cancel": string

  // Report
  "report.title": string
  "report.summary": string
  "report.overallScore": string
  "report.findings": string
  "report.recommendations": string
  "report.critical": string
  "report.high": string
  "report.medium": string
  "report.low": string
  "report.info": string
  "report.exportPdf": string
  "report.exportCsv": string
  "report.share": string
  "report.newReview": string
  "report.backToDashboard": string
  "report.details": string
  "report.evidence": string
  "report.remediation": string

  // Workspace
  "workspace.title": string
  "workspace.reviews": string
  "workspace.documents": string
  "workspace.settings": string
  "workspace.team": string
  "workspace.newWorkspace": string
  "workspace.selectWorkspace": string
  "workspace.noWorkspaces": string

  // Analysis View
  "analysis.title": string
  "analysis.inProgress": string
  "analysis.completed": string
  "analysis.failed": string
  "analysis.retry": string
  "analysis.viewReport": string
  "analysis.progress": string

  // Domain-specific (Customs/Pedimento)
  "domain.glosadorInteligente": string
  "domain.byMocerto": string
  "domain.productTagline": string
  "domain.productDescription": string
  "domain.simplifyingCommerce": string
  "domain.secureLogin": string
  "domain.enterCredentials": string
  "domain.contactAdmin": string
  "domain.reviews": string
  "domain.reviewsSubtitle": string
  "domain.documents": string
  "domain.searchPlaceholder": string
  "domain.noReviewsFound": string
  "domain.completed": string
  "domain.inProgress": string
  "domain.matches": string
  "domain.mismatches": string
  "domain.warnings": string
  "domain.viewReport": string
  "domain.continueReview": string
  "domain.backToDashboard": string
  "domain.howItWorks": string
  "domain.howItWorksStep1": string
  "domain.howItWorksStep2": string
  "domain.howItWorksStep3": string
  "domain.uploadedDocuments": string
  "domain.markPedimento": string
  "domain.mainPedimento": string
  "domain.startAnalysis": string
  "domain.readyToAnalyze": string
  "domain.pleaseMarkPedimento": string
  "domain.uploadAtLeast": string
  "domain.dragDropFiles": string
  "domain.clickToBrowse": string
  "domain.supportedFormatsShort": string
  "domain.dropFilesHere": string
  "domain.analyzingDocuments": string
  "domain.processingDocs": string
  "domain.extractingData": string
  "domain.parsingFields": string
  "domain.readingInvoice": string
  "domain.analyzingBol": string
  "domain.crossReferencing": string
  "domain.identifyingDiscrepancies": string
  "domain.generatingReport": string
  "domain.complianceReport": string
  "domain.complianceScore": string
  "domain.pedimentoValue": string
  "domain.match": string
  "domain.mismatch": string
  "domain.warning": string
  "domain.missing": string
  "domain.all": string
  "domain.export": string
  "domain.noFieldsMatch": string
}

export type Translations = TranslationKeys
