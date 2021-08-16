# Tidy Config

## About
Tidy Config (or `tidy-config`) is a small utility designed to enhance two things when working with a Node project:

1. Create a version of your `package.json` file that uses the YAML format, allowing for easier reading, and more importantly, inline comments.
2. Move configuration files for other packages from the root into a configuration folder, leaving behind symlinks which can be hidden in your code editor.

## Using the utility

### Setting up for the first time

Run the command in the root of your project where the `package.json` file is located:

```
tidy-config --init
```

This will walk you through the options and will add settings to your `package.json`, create a configuration folder and optionally move configuration files.

### Keeping the YAML file in sync

Keeping the `package.json` and `package.yaml` file in sync can be a little tricky. By default we add a `postinstall` script in `package.json` to automatically run a sync anytime there is a package installed.

If changes are detected in both `package.json` and the YAML file, then by default the `package.json` content will be considered the master. It is therefore important to run the sync command any time there are changes in either of the two files.

```
tidy-config --sync
```

### Command-line options

| Option | Description |
| --- | --- |
| `--init` | Sets up some initial settings in your `package.json` file
| `--move` | Move any files listed in `package.json` in the setting `tidyConfig.files` setting from the project root folder into your configuration folder, leaving behind a symlink
| `--vscode` | Update the workspace settings for Visual Studio Code to ignore any symlinked files that now reside in the configuration folder
| `--restore` | Restore any configuration files that were moved from the root folder
| `--sync` | Sync the settings between the root `package.json` and the `package.yaml` file located in the configuration folder
| `--force` | When performing a `package.json` sync, force wither the root `package.json` file (`--force=json`) or the `package.yaml` (`--force=yaml`) in the configuration folder to be considered the master
| `--debug` | Show tool debugging messages
| `--quiet` | Hide output - good for automated usage
