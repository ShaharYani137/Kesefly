---
name: apple-human-interface-guidelines
description: Use when designing, building, or reviewing an app or game for Apple platforms (iOS, iPadOS, macOS, tvOS, visionOS, watchOS) — layout, components, typography, color, Dark Mode, materials, Liquid Glass, SF Symbols, app icons, accessibility, gestures and other inputs, widgets, notifications, or any Apple technology such as Apple Pay, CarPlay, or Siri — or when someone asks what Apple's Human Interface Guidelines (HIG) say.
---

# Apple Human Interface Guidelines

The complete text of Apple's [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines), one Markdown file per page in `references/`. In Apple's words: *"The HIG contains guidance and best practices that can help you design a great experience for any Apple platform."*

## How to use this skill

1. Find the relevant page(s) in the index below. For a specific term or value, search instead: `grep -ril "hit region" references/`.
2. Read the reference file before answering. Base every design statement, measurement, and recommendation on what the file says.
3. Quote or closely paraphrase Apple's wording, and cite the page's `Source:` URL (at the top of each file).
4. If the guidelines don't cover the question, say so plainly rather than filling the gap with an assumption presented as Apple guidance.
5. Check the `Platforms:` line and platform-specific headings (for example "Platform considerations") — guidance often differs between iOS, macOS, visionOS, and the rest.
6. Links between pages point to sibling files in `references/`; follow them when a page defers to another topic.

Each file keeps Apple's headings, lists, tables, and notes. Images and videos are represented by Apple's own alt text (`[Image: …]`). The `Last update noted by Apple` line reproduces Apple's change notice for that page.

## Index

Organized exactly as the HIG's own navigation, with Apple's one-line summary for every page.

<!-- INDEX:START -->

_172 pages, synced 2026-09-27._

### [Getting started](references/getting-started.md)

*Create an app or game that feels at home on every platform you support.*

- [Design principles](references/design-principles.md) — Explore fundamental principles that guide design across Apple platforms.
- [Designing for iOS](references/designing-for-ios.md) — People depend on their iPhone to help them stay connected, play games, view media, accomplish tasks, and track personal data in any location and while on the go.
- [Designing for iPadOS](references/designing-for-ipados.md) — People value the power, mobility, and flexibility of iPad as they enjoy media, play games, perform detailed productivity tasks, and bring their creations to life.
- [Designing for macOS](references/designing-for-macos.md) — People rely on the power, spaciousness, and flexibility of a Mac as they perform in-depth productivity tasks, view media or content, and play games, often using several apps at once.
- [Designing for tvOS](references/designing-for-tvos.md) — People enjoy the vibrant content, immersive experiences, and streamlined interactions that tvOS delivers in media and games, as well as in fitness, education, and home utility apps.
- [Designing for visionOS](references/designing-for-visionos.md) — When people wear Apple Vision Pro, they enter an infinite 3D space where they can engage with your app or game while staying connected to their surroundings.
- [Designing for watchOS](references/designing-for-watchos.md) — When people glance at their Apple Watch, they know they can access essential information and perform simple, timely tasks whether they’re stationary or in motion.
- [Designing for games](references/designing-for-games.md) — When people play your game on an Apple device, they dive into the world you designed while relying on the platform features they love.
- [Designing for iPhone Duo](references/designing-for-iphone-duo.md) — An app designed for iPhone Duo adapts seamlessly to both displays, providing a continuous experience as the device opens and closes.

### [Foundations](references/foundations.md)

*Understand how fundamental design elements help you create rich experiences.*

- [Accessibility](references/accessibility.md) — Accessible user interfaces empower everyone to have a great experience with your app or game.
- [App icons](references/app-icons.md) — A unique, memorable icon expresses your app’s or game’s purpose and personality and helps people recognize it at a glance.
- [Branding](references/branding.md) — Apps and games express their unique brand identity in ways that make them instantly recognizable while feeling at home on the platform and giving people a consistent experience.
- [Color](references/color.md) — Judicious use of color can enhance communication, evoke your brand, provide visual continuity, communicate status and feedback, and help people understand information.
- [Dark Mode](references/dark-mode.md) — Dark Mode is a systemwide appearance setting that uses a dark color palette to provide a comfortable viewing experience tailored for low-light environments.
- [Icons](references/icons.md) — An effective icon is a graphic asset that expresses a single concept in ways people instantly understand.
- [Images](references/images.md) — To make sure your artwork looks great on all devices you support, learn how the system displays content and how to deliver art at the appropriate scale factors.
- [Immersive experiences](references/immersive-experiences.md) — In visionOS, you can design apps and games that extend beyond windows and volumes, immersing people in your content.
- [Inclusion](references/inclusion.md) — Inclusive apps and games put people first by prioritizing respectful communication and presenting content and functionality in ways that everyone can access and understand.
- [Layout](references/layout.md) — A consistent layout that adapts across display sizes, orientations, and multitasking configurations helps people understand and enjoy your app or game on all their devices.
- [Materials](references/materials.md) — A material is a visual effect that creates a sense of depth, layering, and hierarchy between foreground and background elements.
- [Motion](references/motion.md) — Beautiful, fluid motions bring the interface to life, conveying status, providing feedback and instruction, and enriching the visual experience of your app or game.
- [Privacy](references/privacy.md) — Privacy is paramount: it’s critical to be transparent about the privacy-related data and resources you require and essential to protect the data people allow you to access.
- [Right to left](references/right-to-left.md) — Support right-to-left languages like Arabic and Hebrew by reversing your interface as needed to match the reading direction of the related scripts.
- [SF Symbols](references/sf-symbols.md) — SF Symbols provides thousands of consistent, highly configurable symbols that integrate seamlessly with the San Francisco system font, automatically aligning with text in all weights and sizes.
- [Spatial layout](references/spatial-layout.md) — Spatial layout techniques help you take advantage of the infinite canvas of Apple Vision Pro and present your content in engaging, comfortable ways.
- [Typography](references/typography.md) — Your typographic choices can help you display legible text, convey an information hierarchy, communicate important content, and express your brand or style.
- [Writing](references/writing.md) — The words you choose within your app are an essential part of its user experience.

### [Patterns](references/patterns.md)

*Get design guidance for supporting common user actions, tasks, and experiences.*

- [Charting data](references/charting-data.md) — Presenting data in a chart can help you communicate information with clarity and appeal.
- [Collaboration and sharing](references/collaboration-and-sharing.md) — Great collaboration and sharing experiences are simple and responsive, letting people engage with the content while communicating effectively with others.
- [Drag and drop](references/drag-and-drop.md) — Using drag and drop, people can move or duplicate selected photos, text, and other content by dragging the selection from one location to another.
- [Entering data](references/entering-data.md) — When you need information from people, design ways that make it easy for them to provide it without making mistakes.
- [Feedback](references/feedback.md) — Feedback helps people know what’s happening, discover what they can do next, understand the results of actions, and avoid mistakes.
- [File management](references/file-management.md) — Some apps can support documents and files that people expect to manage throughout the system.
- [Going full screen](references/going-full-screen.md) — iPhone, iPad, and Mac offer full-screen modes that let people expand a window to fill the screen, hiding system controls and providing a distraction-free environment.
- [Launching](references/launching.md) — A streamlined launch experience helps people start using your app or game immediately.
- [Live-viewing apps](references/live-viewing-apps.md) — As you design a live-viewing app, prioritize the content and create fun, fluid interactions that encourage immersion in the live-viewing experience.
- [Loading](references/loading.md) — The best content-loading experience finishes before people become aware of it.
- [Managing accounts](references/managing-accounts.md) — When it doesn’t create an unnecessary barrier to your experience, an account can be a convenient way for people to access their content and track personal details.
- [Managing notifications](references/managing-notifications.md) — Notifications can give people timely and important information, whether the device is locked or in use.
- [Modality](references/modality.md) — Modality is a design technique that presents content in a separate, dedicated mode that prevents interaction with the parent view and requires an explicit action to dismiss.
- [Multitasking](references/multitasking.md) — Multitasking lets people switch quickly from one app to another, performing tasks in each.
- [Offering help](references/offering-help.md) — Although the most effective experiences are approachable and intuitive, you can provide contextual help when necessary.
- [Onboarding](references/onboarding.md) — Onboarding can help people get a quick start using your app or game.
- [Playing audio](references/playing-audio.md) — People expect rich audio experiences that automatically adjust when the context changes on the device.
- [Playing haptics](references/playing-haptics.md) — Playing haptics can engage people’s sense of touch and bring their familiarity with the physical world into your app or game.
- [Playing video](references/playing-video.md) — People expect to enjoy rich video experiences on their devices, regardless of the app or game they’re using.
- [Printing](references/printing.md) — An iOS, iPadOS, macOS, or visionOS app can integrate system-provided print functionality when it makes sense, presenting custom printer- and document-specific options if necessary.
- [Ratings and reviews](references/ratings-and-reviews.md) — People often view the ratings and reviews for an app or game before they download it.
- [Searching](references/searching.md) — People use various search techniques to find content on their device, within an app, and within a document or file.
- [Settings](references/settings.md) — People expect apps and games to just work, but they also appreciate having ways to customize the experience to fit their needs.
- [Undo and redo](references/undo-and-redo.md) — Undo and redo gives people easy ways to reverse many types of actions, which can also help people explore and experiment safely as they learn a new interface or task.
- [Workouts](references/workouts.md) — A great workout or fitness experience encourages people to engage with their current activity and helps them track their progress on their devices.

### [Components](references/components.md)

*Learn how to use and customize system-defined components to give people a familiar and consistent experience.*

- [Content](references/content.md) — 
  - [Charts](references/charts.md) — Organize data in a chart to communicate information with clarity and visual appeal.
  - [Image views](references/image-views.md) — An image view displays a single image — or in some cases, an animated sequence of images — on a transparent or opaque background.
  - [Text views](references/text-views.md) — A text view displays multiline, styled text content, which can optionally be editable.
  - [Web views](references/web-views.md) — A web view loads and displays rich web content, such as embedded HTML and websites, directly within your app.
- [Layout and organization](references/layout-and-organization.md) — 
  - [Boxes](references/boxes.md) — A box creates a visually distinct group of logically related information and components.
  - [Collections](references/collections.md) — A collection manages an ordered set of content and presents it in a customizable and highly visual layout.
  - [Column views](references/column-views.md) — A column view — also called a *browser* — lets people view and navigate a data hierarchy using a series of vertical columns.
  - [Disclosure controls](references/disclosure-controls.md) — Disclosure controls reveal and hide information and functionality related to specific controls or views.
  - [Labels](references/labels.md) — A label is a static piece of text that people can read and often copy, but not edit.
  - [Lists and tables](references/lists-and-tables.md) — Lists and tables present data in one or more columns of rows.
  - [Lockups](references/lockups.md) — Lockups combine multiple separate views into a single, interactive unit.
  - [Outline views](references/outline-views.md) — An outline view presents hierarchical data in a scrolling list of cells that are organized into columns and rows.
  - [Split views](references/split-views.md) — A split view manages the presentation of multiple adjacent panes of content, each of which can contain a variety of components, including tables, collections, images, and custom views.
  - [Tab views](references/tab-views.md) — A tab view presents multiple mutually exclusive panes of content in the same area, which people can switch between using a tabbed control.
- [Menus and actions](references/menus-and-actions.md) — 
  - [Activity views](references/activity-views.md) — An activity view — often called a *share sheet* — presents a range of tasks that people can perform in the current context.
  - [Buttons](references/buttons.md) — A button initiates an instantaneous action.
  - [Context menus](references/context-menus.md) — A context menu provides access to functionality that’s directly related to an item, without cluttering the interface.
  - [Dock menus](references/dock-menus.md) — On a Mac, people can secondary click an app’s or game’s icon in the Dock to reveal a Dock menu, which presents both system-provided and custom items.
  - [Edit menus](references/edit-menus.md) — An edit menu lets people make changes to selected content in the current view, in addition to offering related commands like Copy, Select, Translate, and Look Up.
  - [Home Screen quick actions](references/home-screen-quick-actions.md) — Home Screen quick actions give people a way to perform app-specific actions from the Home Screen.
  - [Menus](references/menus.md) — A menu reveals its options when people interact with it, making it a space-efficient way to present commands in your app or game.
  - [Ornaments](references/ornaments.md) — In visionOS, an ornament presents controls and information related to a window, without crowding or obscuring the window’s contents.
  - [Pop-up buttons](references/pop-up-buttons.md) — A pop-up button displays a menu of mutually exclusive options.
  - [Pull-down buttons](references/pull-down-buttons.md) — A pull-down button displays a menu of items or actions that directly relate to the button’s purpose.
  - [The menu bar](references/the-menu-bar.md) — On a Mac or an iPad, the menu bar at the top of the screen displays the top-level menus in your app or game.
  - [Toolbars](references/toolbars.md) — A toolbar provides convenient access to frequently used commands, controls, navigation, and search.
- [Navigation and search](references/navigation-and-search.md) — 
  - [Path controls](references/path-controls.md) — A path control shows the file system path of a selected file or folder.
  - [Search fields](references/search-fields.md) — A search field lets people search a collection of content for specific terms they enter.
  - [Sidebars](references/sidebars.md) — A sidebar appears on the leading side of a view and lets people navigate between areas of your app or top-level collections of content, like folders and playlists.
  - [Tab bars](references/tab-bars.md) — A tab bar lets people navigate between top-level sections of your app.
  - [Token fields](references/token-fields.md) — A token field is a type of text field that can convert text into *tokens* that are easy to select and manipulate.
- [Presentation](references/presentation.md) — 
  - [Action sheets](references/action-sheets.md) — An action sheet is a modal view that presents choices related to an action people initiate.
  - [Alerts](references/alerts.md) — An alert gives people critical information they need right away.
  - [Page controls](references/page-controls.md) — A page control displays a row of indicator images, each of which represents a page in a flat list.
  - [Panels](references/panels.md) — In a macOS app, a panel typically floats above other open windows providing supplementary controls, options, or information related to the active window or current selection.
  - [Popovers](references/popovers.md) — A popover is a transient view that appears above other content when people click or tap a control or interactive area.
  - [Scroll views](references/scroll-views.md) — A scroll view lets people view content that’s larger than the view’s boundaries by moving the content vertically or horizontally.
  - [Sheets](references/sheets.md) — A sheet helps people perform a scoped task that’s closely related to their current context.
  - [Windows](references/windows.md) — A window presents UI views and components in your app or game.
- [Selection and input](references/selection-and-input.md) — 
  - [Color wells](references/color-wells.md) — A color well lets people adjust the color of text, shapes, guides, and other onscreen elements.
  - [Combo boxes](references/combo-boxes.md) — A combo box combines a text field with a pull-down button in a single control.
  - [Digit entry views](references/digit-entry-views.md) — A digit entry view fills the entire screen and prompts people to enter a series of digits, like a PIN, using a digit-specific keyboard.
  - [Image wells](references/image-wells.md) — An image well is an editable version of an image view.
  - [Pickers](references/pickers.md) — A picker displays one or more scrollable lists of distinct values that people can choose from.
  - [Segmented controls](references/segmented-controls.md) — A segmented control is a linear set of two or more segments, each of which functions as a button.
  - [Sliders](references/sliders.md) — A slider is a horizontal track with a control, called a thumb, that people can adjust between a minimum and maximum value.
  - [Steppers](references/steppers.md) — A stepper is a two-segment control that people use to increase or decrease an incremental value.
  - [Text fields](references/text-fields.md) — A text field is a rectangular area in which people enter or edit small, specific pieces of text.
  - [Toggles](references/toggles.md) — A toggle lets people choose between a pair of opposing states, like on and off, using a different appearance to indicate each state.
  - [Virtual keyboards](references/virtual-keyboards.md) — On devices without physical keyboards, the system offers various types of virtual keyboards people can use to enter data.
- [Status](references/status.md) — 
  - [Activity rings](references/activity-rings.md) — Activity rings show an individual’s daily progress toward Move, Exercise, and Stand goals.
  - [Gauges](references/gauges.md) — A gauge displays a specific numerical value within a range of values.
  - [Progress indicators](references/progress-indicators.md) — Progress indicators let people know that your app isn’t stalled while it loads content or performs lengthy operations.
  - [Rating indicators](references/rating-indicators.md) — A rating indicator uses a series of horizontally arranged graphical symbols — by default, stars — to communicate a ranking level.
- [System experiences](references/system-experiences.md) — 
  - [App Shortcuts](references/app-shortcuts.md) — An App Shortcut gives people access to your app’s key functions or content throughout the system.
  - [Complications](references/complications.md) — A complication displays timely, relevant information on the watch face, where people can view it each time they raise their wrist.
  - [Controls](references/controls.md) — A control provides quick access to a feature of your app from Control Center, the Lock Screen, or the Action button.
  - [Live Activities](references/live-activities.md) — A Live Activity lets people track the progress of an activity, event, or task at a glance.
  - [Notifications](references/notifications.md) — A notification gives people timely, high-value information they can understand at a glance.
  - [Snippets](references/snippets.md) — When someone performs a task with Siri or an App Shortcut, a snippet shows the result or asks for confirmation.
  - [Status bars](references/status-bars.md) — A status bar appears along the upper edge of the screen and displays information about the device’s current state, like the time, cellular carrier, and battery level.
  - [Top Shelf](references/top-shelf.md) — The Apple TV Home Screen provides an area called Top Shelf, which showcases your content in a rich, engaging way while also giving people access to their favorite apps in the Dock.
  - [Watch faces](references/watch-faces.md) — A watch face is a view that people choose as their primary view in watchOS.
  - [Widgets](references/widgets.md) — A widget provides quick access to essential information and focused interactions from your app or game in additional contexts.

### [Inputs](references/inputs.md)

*Learn about the various methods people use to control your app or game and enter data.*

- [Action button](references/action-button.md) — The Action button gives people quick access to their favorite features on supported iPhone and Apple Watch models.
- [Apple Pencil and Scribble](references/apple-pencil-and-scribble.md) — Apple Pencil helps make drawing, handwriting, and marking effortless and natural, in addition to performing well as a pointer and UI interaction tool.
- [Camera Control](references/camera-control.md) — The Camera Control provides direct access to your app’s camera experience.
- [Digital Crown](references/digital-crown.md) — The Digital Crown is an important hardware input for Apple Vision Pro and Apple Watch.
- [Eyes](references/eyes.md) — In visionOS, people look at a virtual object to identify it as a target they can interact with.
- [Focus and selection](references/focus-and-selection.md) — Focus helps people visually confirm the object that their interaction targets.
- [Game controls](references/game-controls.md) — Precise, intuitive game controls enhance gameplay and can increase a player’s immersion in the game.
- [Gestures](references/gestures.md) — A gesture is a physical motion that a person uses to directly affect an object in an app or game on their device.
- [Gyroscope and accelerometer](references/gyro-and-accelerometer.md) — On-device gyroscopes and accelerometers can supply data about a device’s movement in the physical world.
- [Keyboards](references/keyboards.md) — A physical keyboard can be an essential input device for entering text, playing games, controlling apps, and more.
- [Nearby interactions](references/nearby-interactions.md) — Nearby interactions support on-device experiences that integrate the presence of people and objects in the nearby environment.
- [Pointing devices](references/pointing-devices.md) — People can use a pointing device like a trackpad or mouse to navigate the interface and initiate actions.
- [Remotes](references/remotes.md) — The Siri Remote is the primary input method for Apple TV, helping people feel connected to onscreen content from across the room.

### [Technologies](references/technologies.md)

*Discover the Apple technologies, features, and services you can integrate into your app or game.*

- [AirPlay](references/airplay.md) — AirPlay lets people stream media content wirelessly from iOS, iPadOS, macOS, and tvOS devices to Apple TV, HomePod, and TVs and speakers that support AirPlay.
- [Always On](references/always-on.md) — On devices that include the Always On display, the system can continue to display an app’s interface when people suspend their interactions with the device.
- [App Clips](references/app-clips.md) — An App Clip is a lightweight version of your app or game that provides an on-the-go or demo experience that’s instantly available.
- [Apple In-App Purchase](references/apple-in-app-purchase.md) — People can use Apple In-App Purchase to pay for digital goods and services, like premium content and subscriptions, securely within your app.
- [Apple Pay](references/apple-pay.md) — Apple Pay is a secure, easy way to make payments for physical goods and services, donations, and subscriptions in apps and in any browser.
- [Augmented reality](references/augmented-reality.md) — Augmented reality (or AR) lets you deliver immersive, engaging experiences that seamlessly blend virtual objects with the real world.
- [CareKit](references/carekit.md) — People can use CareKit apps to manage care plans related to a chronic illness like diabetes, recover from an injury or surgery, or achieve health and wellness goals.
- [CarPlay](references/carplay.md) — CarPlay lets people get directions, make calls, send and receive messages, listen to music, and more from their car’s built-in display, all while staying focused on the road.
- [Game Center](references/game-center.md) — Game Center is Apple’s social gaming network, which lets players track their progress and connect with friends across Apple platforms, and boosts the discovery of your game across players’ devices.
- [Generative AI](references/generative-ai.md) — Generative AI empowers you to enhance your app or game with dynamic content and offer intelligent features that unlock new levels of creativity, connection, and productivity.
- [HealthKit](references/healthkit.md) — HealthKit is the central repository for health and fitness data in iOS, iPadOS, and watchOS.
- [HomeKit](references/homekit.md) — HomeKit lets people securely control connected accessories in their homes using Siri or the Home app on iPhone, iPad, Apple Watch, and Mac.
- [iCloud](references/icloud.md) — iCloud is a service that lets people seamlessly access the content they care about — photos, videos, documents, and more — from any device, without performing explicit synchronization.
- [ID Verifier](references/id-verifier.md) — ID Verifier lets your iPhone app read mobile IDs in person without requiring external hardware.
- [iMessage apps and stickers](references/imessage-apps-and-stickers.md) — An iMessage app can help people share content, collaborate, and even play games with others in a conversation; stickers are images that people can use to decorate a conversation.
- [Live Photos](references/live-photos.md) — Live Photos lets people capture favorite memories in a sound- and motion-rich interactive experience that adds vitality to traditional still photos.
- [Mac Catalyst](references/mac-catalyst.md) — When you use Mac Catalyst to create a Mac version of your iPad app, you give people the opportunity to enjoy the experience in a new environment.
- [Machine learning](references/machine-learning.md) — Machine learning enables apps and games to learn from data and usage patterns, letting you improve existing experiences and create engaging new ones.
- [Maps](references/maps.md) — A map displays outdoor or indoor geographical data in your app or on your website.
- [NFC](references/nfc.md) — Near-field communication (NFC) allows devices within a few centimeters of each other to exchange information wirelessly.
- [Photo editing](references/photo-editing.md) — Photo-editing extensions let people modify photos and videos within the Photos app by applying filters or making other changes.
- [ResearchKit](references/researchkit.md) — A research app lets people everywhere participate in important medical research studies.
- [SharePlay](references/shareplay.md) — SharePlay lets people experience activities together from anywhere, whether they’re watching a movie, playing a game, or sketching on a whiteboard.
- [ShazamKit](references/shazamkit.md) — ShazamKit supports audio recognition by matching an audio sample against the ShazamKit catalog or a custom audio catalog.
- [Sign in with Apple](references/sign-in-with-apple.md) — Sign in with Apple provides a fast, private way to sign into apps and websites, giving people a consistent experience they can trust and the convenience of not having to remember multiple accounts and passwords.
- [Siri](references/siri.md) — People use Siri to help them with the things they need to find, know, or do every day.
- [Tap to Pay on iPhone](references/tap-to-pay-on-iphone.md) — Tap to Pay on iPhone lets merchants accept contactless payments using an app on their iPhone, without having to connect external hardware.
- [VoiceOver](references/voiceover.md) — VoiceOver is a screen reader that lets people experience your app’s interface without needing to see the screen.
- [Wallet](references/wallet.md) — Wallet helps people securely store their credit and debit cards, driver’s license or state ID, transit cards, event tickets, keys, and more on iPhone and Apple Watch.

<!-- INDEX:END -->

## Keeping this current

The HIG changes over time. Run `python3 scripts/sync_hig.py` to download the latest pages from developer.apple.com and rebuild `references/` and this index.

---
Content © Apple Inc. All rights reserved. Reproduced from developer.apple.com for reference. Not affiliated with or endorsed by Apple.
