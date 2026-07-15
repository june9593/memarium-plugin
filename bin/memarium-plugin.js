#!/usr/bin/env node
import{createRequire}from'module';const require=createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x2) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x2, {
  get: (a, b2) => (typeof require !== "undefined" ? require : a)[b2]
}) : x2)(function(x2) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x2 + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/commander/lib/error.js
var require_error = __commonJS({
  "node_modules/commander/lib/error.js"(exports) {
    var CommanderError2 = class extends Error {
      /**
       * Constructs the CommanderError class
       * @param {number} exitCode suggested exit code which could be used with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       */
      constructor(exitCode, code, message) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
        this.code = code;
        this.exitCode = exitCode;
        this.nestedError = void 0;
      }
    };
    var InvalidArgumentError2 = class extends CommanderError2 {
      /**
       * Constructs the InvalidArgumentError class
       * @param {string} [message] explanation of why argument is invalid
       */
      constructor(message) {
        super(1, "commander.invalidArgument", message);
        Error.captureStackTrace(this, this.constructor);
        this.name = this.constructor.name;
      }
    };
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
  }
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS({
  "node_modules/commander/lib/argument.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Argument2 = class {
      /**
       * Initialize a new command argument with the given name and description.
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @param {string} name
       * @param {string} [description]
       */
      constructor(name, description) {
        this.description = description || "";
        this.variadic = false;
        this.parseArg = void 0;
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.argChoices = void 0;
        switch (name[0]) {
          case "<":
            this.required = true;
            this._name = name.slice(1, -1);
            break;
          case "[":
            this.required = false;
            this._name = name.slice(1, -1);
            break;
          default:
            this.required = true;
            this._name = name;
            break;
        }
        if (this._name.length > 3 && this._name.slice(-3) === "...") {
          this.variadic = true;
          this._name = this._name.slice(0, -3);
        }
      }
      /**
       * Return argument name.
       *
       * @return {string}
       */
      name() {
        return this._name;
      }
      /**
       * @package
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Argument}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Set the custom handler for processing CLI command arguments into argument values.
       *
       * @param {Function} [fn]
       * @return {Argument}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Only allow argument value to be one of choices.
       *
       * @param {string[]} values
       * @return {Argument}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Make argument required.
       *
       * @returns {Argument}
       */
      argRequired() {
        this.required = true;
        return this;
      }
      /**
       * Make argument optional.
       *
       * @returns {Argument}
       */
      argOptional() {
        this.required = false;
        return this;
      }
    };
    function humanReadableArgName(arg) {
      const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
      return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
    }
    exports.Argument = Argument2;
    exports.humanReadableArgName = humanReadableArgName;
  }
});

// node_modules/commander/lib/help.js
var require_help = __commonJS({
  "node_modules/commander/lib/help.js"(exports) {
    var { humanReadableArgName } = require_argument();
    var Help2 = class {
      constructor() {
        this.helpWidth = void 0;
        this.sortSubcommands = false;
        this.sortOptions = false;
        this.showGlobalOptions = false;
      }
      /**
       * Get an array of the visible subcommands. Includes a placeholder for the implicit help command, if there is one.
       *
       * @param {Command} cmd
       * @returns {Command[]}
       */
      visibleCommands(cmd) {
        const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
        const helpCommand = cmd._getHelpCommand();
        if (helpCommand && !helpCommand._hidden) {
          visibleCommands.push(helpCommand);
        }
        if (this.sortSubcommands) {
          visibleCommands.sort((a, b2) => {
            return a.name().localeCompare(b2.name());
          });
        }
        return visibleCommands;
      }
      /**
       * Compare options for sort.
       *
       * @param {Option} a
       * @param {Option} b
       * @returns {number}
       */
      compareOptions(a, b2) {
        const getSortKey = (option) => {
          return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
        };
        return getSortKey(a).localeCompare(getSortKey(b2));
      }
      /**
       * Get an array of the visible options. Includes a placeholder for the implicit help option, if there is one.
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleOptions(cmd) {
        const visibleOptions = cmd.options.filter((option) => !option.hidden);
        const helpOption = cmd._getHelpOption();
        if (helpOption && !helpOption.hidden) {
          const removeShort = helpOption.short && cmd._findOption(helpOption.short);
          const removeLong = helpOption.long && cmd._findOption(helpOption.long);
          if (!removeShort && !removeLong) {
            visibleOptions.push(helpOption);
          } else if (helpOption.long && !removeLong) {
            visibleOptions.push(
              cmd.createOption(helpOption.long, helpOption.description)
            );
          } else if (helpOption.short && !removeShort) {
            visibleOptions.push(
              cmd.createOption(helpOption.short, helpOption.description)
            );
          }
        }
        if (this.sortOptions) {
          visibleOptions.sort(this.compareOptions);
        }
        return visibleOptions;
      }
      /**
       * Get an array of the visible global options. (Not including help.)
       *
       * @param {Command} cmd
       * @returns {Option[]}
       */
      visibleGlobalOptions(cmd) {
        if (!this.showGlobalOptions) return [];
        const globalOptions = [];
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          const visibleOptions = ancestorCmd.options.filter(
            (option) => !option.hidden
          );
          globalOptions.push(...visibleOptions);
        }
        if (this.sortOptions) {
          globalOptions.sort(this.compareOptions);
        }
        return globalOptions;
      }
      /**
       * Get an array of the arguments if any have a description.
       *
       * @param {Command} cmd
       * @returns {Argument[]}
       */
      visibleArguments(cmd) {
        if (cmd._argsDescription) {
          cmd.registeredArguments.forEach((argument) => {
            argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
          });
        }
        if (cmd.registeredArguments.find((argument) => argument.description)) {
          return cmd.registeredArguments;
        }
        return [];
      }
      /**
       * Get the command term to show in the list of subcommands.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandTerm(cmd) {
        const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
        return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + // simplistic check for non-help option
        (args ? " " + args : "");
      }
      /**
       * Get the option term to show in the list of options.
       *
       * @param {Option} option
       * @returns {string}
       */
      optionTerm(option) {
        return option.flags;
      }
      /**
       * Get the argument term to show in the list of arguments.
       *
       * @param {Argument} argument
       * @returns {string}
       */
      argumentTerm(argument) {
        return argument.name();
      }
      /**
       * Get the longest command term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestSubcommandTermLength(cmd, helper) {
        return helper.visibleCommands(cmd).reduce((max, command) => {
          return Math.max(max, helper.subcommandTerm(command).length);
        }, 0);
      }
      /**
       * Get the longest option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestOptionTermLength(cmd, helper) {
        return helper.visibleOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest global option term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestGlobalOptionTermLength(cmd, helper) {
        return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
          return Math.max(max, helper.optionTerm(option).length);
        }, 0);
      }
      /**
       * Get the longest argument term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      longestArgumentTermLength(cmd, helper) {
        return helper.visibleArguments(cmd).reduce((max, argument) => {
          return Math.max(max, helper.argumentTerm(argument).length);
        }, 0);
      }
      /**
       * Get the command usage to be displayed at the top of the built-in help.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandUsage(cmd) {
        let cmdName = cmd._name;
        if (cmd._aliases[0]) {
          cmdName = cmdName + "|" + cmd._aliases[0];
        }
        let ancestorCmdNames = "";
        for (let ancestorCmd = cmd.parent; ancestorCmd; ancestorCmd = ancestorCmd.parent) {
          ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
        }
        return ancestorCmdNames + cmdName + " " + cmd.usage();
      }
      /**
       * Get the description for the command.
       *
       * @param {Command} cmd
       * @returns {string}
       */
      commandDescription(cmd) {
        return cmd.description();
      }
      /**
       * Get the subcommand summary to show in the list of subcommands.
       * (Fallback to description for backwards compatibility.)
       *
       * @param {Command} cmd
       * @returns {string}
       */
      subcommandDescription(cmd) {
        return cmd.summary() || cmd.description();
      }
      /**
       * Get the option description to show in the list of options.
       *
       * @param {Option} option
       * @return {string}
       */
      optionDescription(option) {
        const extraInfo = [];
        if (option.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (option.defaultValue !== void 0) {
          const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
          if (showDefault) {
            extraInfo.push(
              `default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`
            );
          }
        }
        if (option.presetArg !== void 0 && option.optional) {
          extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
        }
        if (option.envVar !== void 0) {
          extraInfo.push(`env: ${option.envVar}`);
        }
        if (extraInfo.length > 0) {
          return `${option.description} (${extraInfo.join(", ")})`;
        }
        return option.description;
      }
      /**
       * Get the argument description to show in the list of arguments.
       *
       * @param {Argument} argument
       * @return {string}
       */
      argumentDescription(argument) {
        const extraInfo = [];
        if (argument.argChoices) {
          extraInfo.push(
            // use stringify to match the display of the default value
            `choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`
          );
        }
        if (argument.defaultValue !== void 0) {
          extraInfo.push(
            `default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`
          );
        }
        if (extraInfo.length > 0) {
          const extraDescripton = `(${extraInfo.join(", ")})`;
          if (argument.description) {
            return `${argument.description} ${extraDescripton}`;
          }
          return extraDescripton;
        }
        return argument.description;
      }
      /**
       * Generate the built-in help text.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {string}
       */
      formatHelp(cmd, helper) {
        const termWidth = helper.padWidth(cmd, helper);
        const helpWidth = helper.helpWidth || 80;
        const itemIndentWidth = 2;
        const itemSeparatorWidth = 2;
        function formatItem(term, description) {
          if (description) {
            const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
            return helper.wrap(
              fullText,
              helpWidth - itemIndentWidth,
              termWidth + itemSeparatorWidth
            );
          }
          return term;
        }
        function formatList(textArray) {
          return textArray.join("\n").replace(/^/gm, " ".repeat(itemIndentWidth));
        }
        let output = [`Usage: ${helper.commandUsage(cmd)}`, ""];
        const commandDescription = helper.commandDescription(cmd);
        if (commandDescription.length > 0) {
          output = output.concat([
            helper.wrap(commandDescription, helpWidth, 0),
            ""
          ]);
        }
        const argumentList = helper.visibleArguments(cmd).map((argument) => {
          return formatItem(
            helper.argumentTerm(argument),
            helper.argumentDescription(argument)
          );
        });
        if (argumentList.length > 0) {
          output = output.concat(["Arguments:", formatList(argumentList), ""]);
        }
        const optionList = helper.visibleOptions(cmd).map((option) => {
          return formatItem(
            helper.optionTerm(option),
            helper.optionDescription(option)
          );
        });
        if (optionList.length > 0) {
          output = output.concat(["Options:", formatList(optionList), ""]);
        }
        if (this.showGlobalOptions) {
          const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
            return formatItem(
              helper.optionTerm(option),
              helper.optionDescription(option)
            );
          });
          if (globalOptionList.length > 0) {
            output = output.concat([
              "Global Options:",
              formatList(globalOptionList),
              ""
            ]);
          }
        }
        const commandList = helper.visibleCommands(cmd).map((cmd2) => {
          return formatItem(
            helper.subcommandTerm(cmd2),
            helper.subcommandDescription(cmd2)
          );
        });
        if (commandList.length > 0) {
          output = output.concat(["Commands:", formatList(commandList), ""]);
        }
        return output.join("\n");
      }
      /**
       * Calculate the pad width from the maximum term length.
       *
       * @param {Command} cmd
       * @param {Help} helper
       * @returns {number}
       */
      padWidth(cmd, helper) {
        return Math.max(
          helper.longestOptionTermLength(cmd, helper),
          helper.longestGlobalOptionTermLength(cmd, helper),
          helper.longestSubcommandTermLength(cmd, helper),
          helper.longestArgumentTermLength(cmd, helper)
        );
      }
      /**
       * Wrap the given string to width characters per line, with lines after the first indented.
       * Do not wrap if insufficient room for wrapping (minColumnWidth), or string is manually formatted.
       *
       * @param {string} str
       * @param {number} width
       * @param {number} indent
       * @param {number} [minColumnWidth=40]
       * @return {string}
       *
       */
      wrap(str2, width, indent, minColumnWidth = 40) {
        const indents = " \\f\\t\\v\xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF";
        const manualIndent = new RegExp(`[\\n][${indents}]+`);
        if (str2.match(manualIndent)) return str2;
        const columnWidth = width - indent;
        if (columnWidth < minColumnWidth) return str2;
        const leadingStr = str2.slice(0, indent);
        const columnText = str2.slice(indent).replace("\r\n", "\n");
        const indentString = " ".repeat(indent);
        const zeroWidthSpace = "\u200B";
        const breaks = `\\s${zeroWidthSpace}`;
        const regex = new RegExp(
          `
|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`,
          "g"
        );
        const lines = columnText.match(regex) || [];
        return leadingStr + lines.map((line, i2) => {
          if (line === "\n") return "";
          return (i2 > 0 ? indentString : "") + line.trimEnd();
        }).join("\n");
      }
    };
    exports.Help = Help2;
  }
});

// node_modules/commander/lib/option.js
var require_option = __commonJS({
  "node_modules/commander/lib/option.js"(exports) {
    var { InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var Option2 = class {
      /**
       * Initialize a new `Option` with the given `flags` and `description`.
       *
       * @param {string} flags
       * @param {string} [description]
       */
      constructor(flags, description) {
        this.flags = flags;
        this.description = description || "";
        this.required = flags.includes("<");
        this.optional = flags.includes("[");
        this.variadic = /\w\.\.\.[>\]]$/.test(flags);
        this.mandatory = false;
        const optionFlags = splitOptionFlags(flags);
        this.short = optionFlags.shortFlag;
        this.long = optionFlags.longFlag;
        this.negate = false;
        if (this.long) {
          this.negate = this.long.startsWith("--no-");
        }
        this.defaultValue = void 0;
        this.defaultValueDescription = void 0;
        this.presetArg = void 0;
        this.envVar = void 0;
        this.parseArg = void 0;
        this.hidden = false;
        this.argChoices = void 0;
        this.conflictsWith = [];
        this.implied = void 0;
      }
      /**
       * Set the default value, and optionally supply the description to be displayed in the help.
       *
       * @param {*} value
       * @param {string} [description]
       * @return {Option}
       */
      default(value, description) {
        this.defaultValue = value;
        this.defaultValueDescription = description;
        return this;
      }
      /**
       * Preset to use when option used without option-argument, especially optional but also boolean and negated.
       * The custom processing (parseArg) is called.
       *
       * @example
       * new Option('--color').default('GREYSCALE').preset('RGB');
       * new Option('--donate [amount]').preset('20').argParser(parseFloat);
       *
       * @param {*} arg
       * @return {Option}
       */
      preset(arg) {
        this.presetArg = arg;
        return this;
      }
      /**
       * Add option name(s) that conflict with this option.
       * An error will be displayed if conflicting options are found during parsing.
       *
       * @example
       * new Option('--rgb').conflicts('cmyk');
       * new Option('--js').conflicts(['ts', 'jsx']);
       *
       * @param {(string | string[])} names
       * @return {Option}
       */
      conflicts(names) {
        this.conflictsWith = this.conflictsWith.concat(names);
        return this;
      }
      /**
       * Specify implied option values for when this option is set and the implied options are not.
       *
       * The custom processing (parseArg) is not called on the implied values.
       *
       * @example
       * program
       *   .addOption(new Option('--log', 'write logging information to file'))
       *   .addOption(new Option('--trace', 'log extra details').implies({ log: 'trace.txt' }));
       *
       * @param {object} impliedOptionValues
       * @return {Option}
       */
      implies(impliedOptionValues) {
        let newImplied = impliedOptionValues;
        if (typeof impliedOptionValues === "string") {
          newImplied = { [impliedOptionValues]: true };
        }
        this.implied = Object.assign(this.implied || {}, newImplied);
        return this;
      }
      /**
       * Set environment variable to check for option value.
       *
       * An environment variable is only used if when processed the current option value is
       * undefined, or the source of the current value is 'default' or 'config' or 'env'.
       *
       * @param {string} name
       * @return {Option}
       */
      env(name) {
        this.envVar = name;
        return this;
      }
      /**
       * Set the custom handler for processing CLI option arguments into option values.
       *
       * @param {Function} [fn]
       * @return {Option}
       */
      argParser(fn) {
        this.parseArg = fn;
        return this;
      }
      /**
       * Whether the option is mandatory and must have a value after parsing.
       *
       * @param {boolean} [mandatory=true]
       * @return {Option}
       */
      makeOptionMandatory(mandatory = true) {
        this.mandatory = !!mandatory;
        return this;
      }
      /**
       * Hide option in help.
       *
       * @param {boolean} [hide=true]
       * @return {Option}
       */
      hideHelp(hide = true) {
        this.hidden = !!hide;
        return this;
      }
      /**
       * @package
       */
      _concatValue(value, previous) {
        if (previous === this.defaultValue || !Array.isArray(previous)) {
          return [value];
        }
        return previous.concat(value);
      }
      /**
       * Only allow option value to be one of choices.
       *
       * @param {string[]} values
       * @return {Option}
       */
      choices(values) {
        this.argChoices = values.slice();
        this.parseArg = (arg, previous) => {
          if (!this.argChoices.includes(arg)) {
            throw new InvalidArgumentError2(
              `Allowed choices are ${this.argChoices.join(", ")}.`
            );
          }
          if (this.variadic) {
            return this._concatValue(arg, previous);
          }
          return arg;
        };
        return this;
      }
      /**
       * Return option name.
       *
       * @return {string}
       */
      name() {
        if (this.long) {
          return this.long.replace(/^--/, "");
        }
        return this.short.replace(/^-/, "");
      }
      /**
       * Return option name, in a camelcase format that can be used
       * as a object attribute key.
       *
       * @return {string}
       */
      attributeName() {
        return camelcase(this.name().replace(/^no-/, ""));
      }
      /**
       * Check if `arg` matches the short or long flag.
       *
       * @param {string} arg
       * @return {boolean}
       * @package
       */
      is(arg) {
        return this.short === arg || this.long === arg;
      }
      /**
       * Return whether a boolean option.
       *
       * Options are one of boolean, negated, required argument, or optional argument.
       *
       * @return {boolean}
       * @package
       */
      isBoolean() {
        return !this.required && !this.optional && !this.negate;
      }
    };
    var DualOptions = class {
      /**
       * @param {Option[]} options
       */
      constructor(options) {
        this.positiveOptions = /* @__PURE__ */ new Map();
        this.negativeOptions = /* @__PURE__ */ new Map();
        this.dualOptions = /* @__PURE__ */ new Set();
        options.forEach((option) => {
          if (option.negate) {
            this.negativeOptions.set(option.attributeName(), option);
          } else {
            this.positiveOptions.set(option.attributeName(), option);
          }
        });
        this.negativeOptions.forEach((value, key) => {
          if (this.positiveOptions.has(key)) {
            this.dualOptions.add(key);
          }
        });
      }
      /**
       * Did the value come from the option, and not from possible matching dual option?
       *
       * @param {*} value
       * @param {Option} option
       * @returns {boolean}
       */
      valueFromOption(value, option) {
        const optionKey = option.attributeName();
        if (!this.dualOptions.has(optionKey)) return true;
        const preset = this.negativeOptions.get(optionKey).presetArg;
        const negativeValue = preset !== void 0 ? preset : false;
        return option.negate === (negativeValue === value);
      }
    };
    function camelcase(str2) {
      return str2.split("-").reduce((str3, word) => {
        return str3 + word[0].toUpperCase() + word.slice(1);
      });
    }
    function splitOptionFlags(flags) {
      let shortFlag;
      let longFlag;
      const flagParts = flags.split(/[ |,]+/);
      if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1]))
        shortFlag = flagParts.shift();
      longFlag = flagParts.shift();
      if (!shortFlag && /^-[^-]$/.test(longFlag)) {
        shortFlag = longFlag;
        longFlag = void 0;
      }
      return { shortFlag, longFlag };
    }
    exports.Option = Option2;
    exports.DualOptions = DualOptions;
  }
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS({
  "node_modules/commander/lib/suggestSimilar.js"(exports) {
    var maxDistance = 3;
    function editDistance(a, b2) {
      if (Math.abs(a.length - b2.length) > maxDistance)
        return Math.max(a.length, b2.length);
      const d = [];
      for (let i2 = 0; i2 <= a.length; i2++) {
        d[i2] = [i2];
      }
      for (let j2 = 0; j2 <= b2.length; j2++) {
        d[0][j2] = j2;
      }
      for (let j2 = 1; j2 <= b2.length; j2++) {
        for (let i2 = 1; i2 <= a.length; i2++) {
          let cost = 1;
          if (a[i2 - 1] === b2[j2 - 1]) {
            cost = 0;
          } else {
            cost = 1;
          }
          d[i2][j2] = Math.min(
            d[i2 - 1][j2] + 1,
            // deletion
            d[i2][j2 - 1] + 1,
            // insertion
            d[i2 - 1][j2 - 1] + cost
            // substitution
          );
          if (i2 > 1 && j2 > 1 && a[i2 - 1] === b2[j2 - 2] && a[i2 - 2] === b2[j2 - 1]) {
            d[i2][j2] = Math.min(d[i2][j2], d[i2 - 2][j2 - 2] + 1);
          }
        }
      }
      return d[a.length][b2.length];
    }
    function suggestSimilar(word, candidates) {
      if (!candidates || candidates.length === 0) return "";
      candidates = Array.from(new Set(candidates));
      const searchingOptions = word.startsWith("--");
      if (searchingOptions) {
        word = word.slice(2);
        candidates = candidates.map((candidate) => candidate.slice(2));
      }
      let similar = [];
      let bestDistance = maxDistance;
      const minSimilarity = 0.4;
      candidates.forEach((candidate) => {
        if (candidate.length <= 1) return;
        const distance = editDistance(word, candidate);
        const length = Math.max(word.length, candidate.length);
        const similarity = (length - distance) / length;
        if (similarity > minSimilarity) {
          if (distance < bestDistance) {
            bestDistance = distance;
            similar = [candidate];
          } else if (distance === bestDistance) {
            similar.push(candidate);
          }
        }
      });
      similar.sort((a, b2) => a.localeCompare(b2));
      if (searchingOptions) {
        similar = similar.map((candidate) => `--${candidate}`);
      }
      if (similar.length > 1) {
        return `
(Did you mean one of ${similar.join(", ")}?)`;
      }
      if (similar.length === 1) {
        return `
(Did you mean ${similar[0]}?)`;
      }
      return "";
    }
    exports.suggestSimilar = suggestSimilar;
  }
});

// node_modules/commander/lib/command.js
var require_command = __commonJS({
  "node_modules/commander/lib/command.js"(exports) {
    var EventEmitter2 = __require("node:events").EventEmitter;
    var childProcess = __require("node:child_process");
    var path = __require("node:path");
    var fs = __require("node:fs");
    var process3 = __require("node:process");
    var { Argument: Argument2, humanReadableArgName } = require_argument();
    var { CommanderError: CommanderError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2, DualOptions } = require_option();
    var { suggestSimilar } = require_suggestSimilar();
    var Command2 = class _Command extends EventEmitter2 {
      /**
       * Initialize a new `Command`.
       *
       * @param {string} [name]
       */
      constructor(name) {
        super();
        this.commands = [];
        this.options = [];
        this.parent = null;
        this._allowUnknownOption = false;
        this._allowExcessArguments = true;
        this.registeredArguments = [];
        this._args = this.registeredArguments;
        this.args = [];
        this.rawArgs = [];
        this.processedArgs = [];
        this._scriptPath = null;
        this._name = name || "";
        this._optionValues = {};
        this._optionValueSources = {};
        this._storeOptionsAsProperties = false;
        this._actionHandler = null;
        this._executableHandler = false;
        this._executableFile = null;
        this._executableDir = null;
        this._defaultCommandName = null;
        this._exitCallback = null;
        this._aliases = [];
        this._combineFlagAndOptionalValue = true;
        this._description = "";
        this._summary = "";
        this._argsDescription = void 0;
        this._enablePositionalOptions = false;
        this._passThroughOptions = false;
        this._lifeCycleHooks = {};
        this._showHelpAfterError = false;
        this._showSuggestionAfterError = true;
        this._outputConfiguration = {
          writeOut: (str2) => process3.stdout.write(str2),
          writeErr: (str2) => process3.stderr.write(str2),
          getOutHelpWidth: () => process3.stdout.isTTY ? process3.stdout.columns : void 0,
          getErrHelpWidth: () => process3.stderr.isTTY ? process3.stderr.columns : void 0,
          outputError: (str2, write) => write(str2)
        };
        this._hidden = false;
        this._helpOption = void 0;
        this._addImplicitHelpCommand = void 0;
        this._helpCommand = void 0;
        this._helpConfiguration = {};
      }
      /**
       * Copy settings that are useful to have in common across root command and subcommands.
       *
       * (Used internally when adding a command using `.command()` so subcommands inherit parent settings.)
       *
       * @param {Command} sourceCommand
       * @return {Command} `this` command for chaining
       */
      copyInheritedSettings(sourceCommand) {
        this._outputConfiguration = sourceCommand._outputConfiguration;
        this._helpOption = sourceCommand._helpOption;
        this._helpCommand = sourceCommand._helpCommand;
        this._helpConfiguration = sourceCommand._helpConfiguration;
        this._exitCallback = sourceCommand._exitCallback;
        this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
        this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
        this._allowExcessArguments = sourceCommand._allowExcessArguments;
        this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
        this._showHelpAfterError = sourceCommand._showHelpAfterError;
        this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
        return this;
      }
      /**
       * @returns {Command[]}
       * @private
       */
      _getCommandAndAncestors() {
        const result = [];
        for (let command = this; command; command = command.parent) {
          result.push(command);
        }
        return result;
      }
      /**
       * Define a command.
       *
       * There are two styles of command: pay attention to where to put the description.
       *
       * @example
       * // Command implemented using action handler (description is supplied separately to `.command`)
       * program
       *   .command('clone <source> [destination]')
       *   .description('clone a repository into a newly created directory')
       *   .action((source, destination) => {
       *     console.log('clone command called');
       *   });
       *
       * // Command implemented using separate executable file (description is second parameter to `.command`)
       * program
       *   .command('start <service>', 'start named service')
       *   .command('stop [service]', 'stop named service, or all if no name supplied');
       *
       * @param {string} nameAndArgs - command name and arguments, args are `<required>` or `[optional]` and last may also be `variadic...`
       * @param {(object | string)} [actionOptsOrExecDesc] - configuration options (for action), or description (for executable)
       * @param {object} [execOpts] - configuration options (for executable)
       * @return {Command} returns new command for action handler, or `this` for executable command
       */
      command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
        let desc = actionOptsOrExecDesc;
        let opts = execOpts;
        if (typeof desc === "object" && desc !== null) {
          opts = desc;
          desc = null;
        }
        opts = opts || {};
        const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
        const cmd = this.createCommand(name);
        if (desc) {
          cmd.description(desc);
          cmd._executableHandler = true;
        }
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        cmd._hidden = !!(opts.noHelp || opts.hidden);
        cmd._executableFile = opts.executableFile || null;
        if (args) cmd.arguments(args);
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd.copyInheritedSettings(this);
        if (desc) return this;
        return cmd;
      }
      /**
       * Factory routine to create a new unattached command.
       *
       * See .command() for creating an attached subcommand, which uses this routine to
       * create the command. You can override createCommand to customise subcommands.
       *
       * @param {string} [name]
       * @return {Command} new command
       */
      createCommand(name) {
        return new _Command(name);
      }
      /**
       * You can customise the help with a subclass of Help by overriding createHelp,
       * or by overriding Help properties using configureHelp().
       *
       * @return {Help}
       */
      createHelp() {
        return Object.assign(new Help2(), this.configureHelp());
      }
      /**
       * You can customise the help by overriding Help properties using configureHelp(),
       * or with a subclass of Help by overriding createHelp().
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureHelp(configuration) {
        if (configuration === void 0) return this._helpConfiguration;
        this._helpConfiguration = configuration;
        return this;
      }
      /**
       * The default output goes to stdout and stderr. You can customise this for special
       * applications. You can also customise the display of errors by overriding outputError.
       *
       * The configuration properties are all functions:
       *
       *     // functions to change where being written, stdout and stderr
       *     writeOut(str)
       *     writeErr(str)
       *     // matching functions to specify width for wrapping help
       *     getOutHelpWidth()
       *     getErrHelpWidth()
       *     // functions based on what is being written out
       *     outputError(str, write) // used for displaying errors, and not used for displaying help
       *
       * @param {object} [configuration] - configuration options
       * @return {(Command | object)} `this` command for chaining, or stored configuration
       */
      configureOutput(configuration) {
        if (configuration === void 0) return this._outputConfiguration;
        Object.assign(this._outputConfiguration, configuration);
        return this;
      }
      /**
       * Display the help or a custom message after an error occurs.
       *
       * @param {(boolean|string)} [displayHelp]
       * @return {Command} `this` command for chaining
       */
      showHelpAfterError(displayHelp = true) {
        if (typeof displayHelp !== "string") displayHelp = !!displayHelp;
        this._showHelpAfterError = displayHelp;
        return this;
      }
      /**
       * Display suggestion of similar commands for unknown commands, or options for unknown options.
       *
       * @param {boolean} [displaySuggestion]
       * @return {Command} `this` command for chaining
       */
      showSuggestionAfterError(displaySuggestion = true) {
        this._showSuggestionAfterError = !!displaySuggestion;
        return this;
      }
      /**
       * Add a prepared subcommand.
       *
       * See .command() for creating an attached subcommand which inherits settings from its parent.
       *
       * @param {Command} cmd - new subcommand
       * @param {object} [opts] - configuration options
       * @return {Command} `this` command for chaining
       */
      addCommand(cmd, opts) {
        if (!cmd._name) {
          throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
        }
        opts = opts || {};
        if (opts.isDefault) this._defaultCommandName = cmd._name;
        if (opts.noHelp || opts.hidden) cmd._hidden = true;
        this._registerCommand(cmd);
        cmd.parent = this;
        cmd._checkForBrokenPassThrough();
        return this;
      }
      /**
       * Factory routine to create a new unattached argument.
       *
       * See .argument() for creating an attached argument, which uses this routine to
       * create the argument. You can override createArgument to return a custom argument.
       *
       * @param {string} name
       * @param {string} [description]
       * @return {Argument} new argument
       */
      createArgument(name, description) {
        return new Argument2(name, description);
      }
      /**
       * Define argument syntax for command.
       *
       * The default is that the argument is required, and you can explicitly
       * indicate this with <> around the name. Put [] around the name for an optional argument.
       *
       * @example
       * program.argument('<input-file>');
       * program.argument('[output-file]');
       *
       * @param {string} name
       * @param {string} [description]
       * @param {(Function|*)} [fn] - custom argument processing function
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      argument(name, description, fn, defaultValue) {
        const argument = this.createArgument(name, description);
        if (typeof fn === "function") {
          argument.default(defaultValue).argParser(fn);
        } else {
          argument.default(fn);
        }
        this.addArgument(argument);
        return this;
      }
      /**
       * Define argument syntax for command, adding multiple at once (without descriptions).
       *
       * See also .argument().
       *
       * @example
       * program.arguments('<cmd> [env]');
       *
       * @param {string} names
       * @return {Command} `this` command for chaining
       */
      arguments(names) {
        names.trim().split(/ +/).forEach((detail) => {
          this.argument(detail);
        });
        return this;
      }
      /**
       * Define argument syntax for command, adding a prepared argument.
       *
       * @param {Argument} argument
       * @return {Command} `this` command for chaining
       */
      addArgument(argument) {
        const previousArgument = this.registeredArguments.slice(-1)[0];
        if (previousArgument && previousArgument.variadic) {
          throw new Error(
            `only the last argument can be variadic '${previousArgument.name()}'`
          );
        }
        if (argument.required && argument.defaultValue !== void 0 && argument.parseArg === void 0) {
          throw new Error(
            `a default value for a required argument is never used: '${argument.name()}'`
          );
        }
        this.registeredArguments.push(argument);
        return this;
      }
      /**
       * Customise or override default help command. By default a help command is automatically added if your command has subcommands.
       *
       * @example
       *    program.helpCommand('help [cmd]');
       *    program.helpCommand('help [cmd]', 'show help');
       *    program.helpCommand(false); // suppress default help command
       *    program.helpCommand(true); // add help command even if no subcommands
       *
       * @param {string|boolean} enableOrNameAndArgs - enable with custom name and/or arguments, or boolean to override whether added
       * @param {string} [description] - custom description
       * @return {Command} `this` command for chaining
       */
      helpCommand(enableOrNameAndArgs, description) {
        if (typeof enableOrNameAndArgs === "boolean") {
          this._addImplicitHelpCommand = enableOrNameAndArgs;
          return this;
        }
        enableOrNameAndArgs = enableOrNameAndArgs ?? "help [command]";
        const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
        const helpDescription = description ?? "display help for command";
        const helpCommand = this.createCommand(helpName);
        helpCommand.helpOption(false);
        if (helpArgs) helpCommand.arguments(helpArgs);
        if (helpDescription) helpCommand.description(helpDescription);
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        return this;
      }
      /**
       * Add prepared custom help command.
       *
       * @param {(Command|string|boolean)} helpCommand - custom help command, or deprecated enableOrNameAndArgs as for `.helpCommand()`
       * @param {string} [deprecatedDescription] - deprecated custom description used with custom name only
       * @return {Command} `this` command for chaining
       */
      addHelpCommand(helpCommand, deprecatedDescription) {
        if (typeof helpCommand !== "object") {
          this.helpCommand(helpCommand, deprecatedDescription);
          return this;
        }
        this._addImplicitHelpCommand = true;
        this._helpCommand = helpCommand;
        return this;
      }
      /**
       * Lazy create help command.
       *
       * @return {(Command|null)}
       * @package
       */
      _getHelpCommand() {
        const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
        if (hasImplicitHelpCommand) {
          if (this._helpCommand === void 0) {
            this.helpCommand(void 0, void 0);
          }
          return this._helpCommand;
        }
        return null;
      }
      /**
       * Add hook for life cycle event.
       *
       * @param {string} event
       * @param {Function} listener
       * @return {Command} `this` command for chaining
       */
      hook(event, listener) {
        const allowedValues = ["preSubcommand", "preAction", "postAction"];
        if (!allowedValues.includes(event)) {
          throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        if (this._lifeCycleHooks[event]) {
          this._lifeCycleHooks[event].push(listener);
        } else {
          this._lifeCycleHooks[event] = [listener];
        }
        return this;
      }
      /**
       * Register callback to use as replacement for calling process.exit.
       *
       * @param {Function} [fn] optional callback which will be passed a CommanderError, defaults to throwing
       * @return {Command} `this` command for chaining
       */
      exitOverride(fn) {
        if (fn) {
          this._exitCallback = fn;
        } else {
          this._exitCallback = (err) => {
            if (err.code !== "commander.executeSubCommandAsync") {
              throw err;
            } else {
            }
          };
        }
        return this;
      }
      /**
       * Call process.exit, and _exitCallback if defined.
       *
       * @param {number} exitCode exit code for using with process.exit
       * @param {string} code an id string representing the error
       * @param {string} message human-readable description of the error
       * @return never
       * @private
       */
      _exit(exitCode, code, message) {
        if (this._exitCallback) {
          this._exitCallback(new CommanderError2(exitCode, code, message));
        }
        process3.exit(exitCode);
      }
      /**
       * Register callback `fn` for the command.
       *
       * @example
       * program
       *   .command('serve')
       *   .description('start service')
       *   .action(function() {
       *      // do work here
       *   });
       *
       * @param {Function} fn
       * @return {Command} `this` command for chaining
       */
      action(fn) {
        const listener = (args) => {
          const expectedArgsCount = this.registeredArguments.length;
          const actionArgs = args.slice(0, expectedArgsCount);
          if (this._storeOptionsAsProperties) {
            actionArgs[expectedArgsCount] = this;
          } else {
            actionArgs[expectedArgsCount] = this.opts();
          }
          actionArgs.push(this);
          return fn.apply(this, actionArgs);
        };
        this._actionHandler = listener;
        return this;
      }
      /**
       * Factory routine to create a new unattached option.
       *
       * See .option() for creating an attached option, which uses this routine to
       * create the option. You can override createOption to return a custom option.
       *
       * @param {string} flags
       * @param {string} [description]
       * @return {Option} new option
       */
      createOption(flags, description) {
        return new Option2(flags, description);
      }
      /**
       * Wrap parseArgs to catch 'commander.invalidArgument'.
       *
       * @param {(Option | Argument)} target
       * @param {string} value
       * @param {*} previous
       * @param {string} invalidArgumentMessage
       * @private
       */
      _callParseArg(target, value, previous, invalidArgumentMessage) {
        try {
          return target.parseArg(value, previous);
        } catch (err) {
          if (err.code === "commander.invalidArgument") {
            const message = `${invalidArgumentMessage} ${err.message}`;
            this.error(message, { exitCode: err.exitCode, code: err.code });
          }
          throw err;
        }
      }
      /**
       * Check for option flag conflicts.
       * Register option if no conflicts found, or throw on conflict.
       *
       * @param {Option} option
       * @private
       */
      _registerOption(option) {
        const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
        if (matchingOption) {
          const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
          throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
        }
        this.options.push(option);
      }
      /**
       * Check for command name and alias conflicts with existing commands.
       * Register command if no conflicts found, or throw on conflict.
       *
       * @param {Command} command
       * @private
       */
      _registerCommand(command) {
        const knownBy = (cmd) => {
          return [cmd.name()].concat(cmd.aliases());
        };
        const alreadyUsed = knownBy(command).find(
          (name) => this._findCommand(name)
        );
        if (alreadyUsed) {
          const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
          const newCmd = knownBy(command).join("|");
          throw new Error(
            `cannot add command '${newCmd}' as already have command '${existingCmd}'`
          );
        }
        this.commands.push(command);
      }
      /**
       * Add an option.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addOption(option) {
        this._registerOption(option);
        const oname = option.name();
        const name = option.attributeName();
        if (option.negate) {
          const positiveLongFlag = option.long.replace(/^--no-/, "--");
          if (!this._findOption(positiveLongFlag)) {
            this.setOptionValueWithSource(
              name,
              option.defaultValue === void 0 ? true : option.defaultValue,
              "default"
            );
          }
        } else if (option.defaultValue !== void 0) {
          this.setOptionValueWithSource(name, option.defaultValue, "default");
        }
        const handleOptionValue = (val, invalidValueMessage, valueSource) => {
          if (val == null && option.presetArg !== void 0) {
            val = option.presetArg;
          }
          const oldValue = this.getOptionValue(name);
          if (val !== null && option.parseArg) {
            val = this._callParseArg(option, val, oldValue, invalidValueMessage);
          } else if (val !== null && option.variadic) {
            val = option._concatValue(val, oldValue);
          }
          if (val == null) {
            if (option.negate) {
              val = false;
            } else if (option.isBoolean() || option.optional) {
              val = true;
            } else {
              val = "";
            }
          }
          this.setOptionValueWithSource(name, val, valueSource);
        };
        this.on("option:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "cli");
        });
        if (option.envVar) {
          this.on("optionEnv:" + oname, (val) => {
            const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
            handleOptionValue(val, invalidValueMessage, "env");
          });
        }
        return this;
      }
      /**
       * Internal implementation shared by .option() and .requiredOption()
       *
       * @return {Command} `this` command for chaining
       * @private
       */
      _optionEx(config, flags, description, fn, defaultValue) {
        if (typeof flags === "object" && flags instanceof Option2) {
          throw new Error(
            "To add an Option object use addOption() instead of option() or requiredOption()"
          );
        }
        const option = this.createOption(flags, description);
        option.makeOptionMandatory(!!config.mandatory);
        if (typeof fn === "function") {
          option.default(defaultValue).argParser(fn);
        } else if (fn instanceof RegExp) {
          const regex = fn;
          fn = (val, def) => {
            const m = regex.exec(val);
            return m ? m[0] : def;
          };
          option.default(defaultValue).argParser(fn);
        } else {
          option.default(fn);
        }
        return this.addOption(option);
      }
      /**
       * Define option with `flags`, `description`, and optional argument parsing function or `defaultValue` or both.
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space. A required
       * option-argument is indicated by `<>` and an optional option-argument by `[]`.
       *
       * See the README for more details, and see also addOption() and requiredOption().
       *
       * @example
       * program
       *     .option('-p, --pepper', 'add pepper')
       *     .option('-p, --pizza-type <TYPE>', 'type of pizza') // required option-argument
       *     .option('-c, --cheese [CHEESE]', 'add extra cheese', 'mozzarella') // optional option-argument with default
       *     .option('-t, --tip <VALUE>', 'add tip to purchase cost', parseFloat) // custom parse function
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      option(flags, description, parseArg, defaultValue) {
        return this._optionEx({}, flags, description, parseArg, defaultValue);
      }
      /**
       * Add a required option which must have a value after parsing. This usually means
       * the option must be specified on the command line. (Otherwise the same as .option().)
       *
       * The `flags` string contains the short and/or long flags, separated by comma, a pipe or space.
       *
       * @param {string} flags
       * @param {string} [description]
       * @param {(Function|*)} [parseArg] - custom option processing function or default value
       * @param {*} [defaultValue]
       * @return {Command} `this` command for chaining
       */
      requiredOption(flags, description, parseArg, defaultValue) {
        return this._optionEx(
          { mandatory: true },
          flags,
          description,
          parseArg,
          defaultValue
        );
      }
      /**
       * Alter parsing of short flags with optional values.
       *
       * @example
       * // for `.option('-f,--flag [value]'):
       * program.combineFlagAndOptionalValue(true);  // `-f80` is treated like `--flag=80`, this is the default behaviour
       * program.combineFlagAndOptionalValue(false) // `-fb` is treated like `-f -b`
       *
       * @param {boolean} [combine] - if `true` or omitted, an optional value can be specified directly after the flag.
       * @return {Command} `this` command for chaining
       */
      combineFlagAndOptionalValue(combine = true) {
        this._combineFlagAndOptionalValue = !!combine;
        return this;
      }
      /**
       * Allow unknown options on the command line.
       *
       * @param {boolean} [allowUnknown] - if `true` or omitted, no error will be thrown for unknown options.
       * @return {Command} `this` command for chaining
       */
      allowUnknownOption(allowUnknown = true) {
        this._allowUnknownOption = !!allowUnknown;
        return this;
      }
      /**
       * Allow excess command-arguments on the command line. Pass false to make excess arguments an error.
       *
       * @param {boolean} [allowExcess] - if `true` or omitted, no error will be thrown for excess arguments.
       * @return {Command} `this` command for chaining
       */
      allowExcessArguments(allowExcess = true) {
        this._allowExcessArguments = !!allowExcess;
        return this;
      }
      /**
       * Enable positional options. Positional means global options are specified before subcommands which lets
       * subcommands reuse the same option names, and also enables subcommands to turn on passThroughOptions.
       * The default behaviour is non-positional and global options may appear anywhere on the command line.
       *
       * @param {boolean} [positional]
       * @return {Command} `this` command for chaining
       */
      enablePositionalOptions(positional = true) {
        this._enablePositionalOptions = !!positional;
        return this;
      }
      /**
       * Pass through options that come after command-arguments rather than treat them as command-options,
       * so actual command-options come before command-arguments. Turning this on for a subcommand requires
       * positional options to have been enabled on the program (parent commands).
       * The default behaviour is non-positional and options may appear before or after command-arguments.
       *
       * @param {boolean} [passThrough] for unknown options.
       * @return {Command} `this` command for chaining
       */
      passThroughOptions(passThrough = true) {
        this._passThroughOptions = !!passThrough;
        this._checkForBrokenPassThrough();
        return this;
      }
      /**
       * @private
       */
      _checkForBrokenPassThrough() {
        if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
          throw new Error(
            `passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`
          );
        }
      }
      /**
       * Whether to store option values as properties on command object,
       * or store separately (specify false). In both cases the option values can be accessed using .opts().
       *
       * @param {boolean} [storeAsProperties=true]
       * @return {Command} `this` command for chaining
       */
      storeOptionsAsProperties(storeAsProperties = true) {
        if (this.options.length) {
          throw new Error("call .storeOptionsAsProperties() before adding options");
        }
        if (Object.keys(this._optionValues).length) {
          throw new Error(
            "call .storeOptionsAsProperties() before setting option values"
          );
        }
        this._storeOptionsAsProperties = !!storeAsProperties;
        return this;
      }
      /**
       * Retrieve option value.
       *
       * @param {string} key
       * @return {object} value
       */
      getOptionValue(key) {
        if (this._storeOptionsAsProperties) {
          return this[key];
        }
        return this._optionValues[key];
      }
      /**
       * Store option value.
       *
       * @param {string} key
       * @param {object} value
       * @return {Command} `this` command for chaining
       */
      setOptionValue(key, value) {
        return this.setOptionValueWithSource(key, value, void 0);
      }
      /**
       * Store option value and where the value came from.
       *
       * @param {string} key
       * @param {object} value
       * @param {string} source - expected values are default/config/env/cli/implied
       * @return {Command} `this` command for chaining
       */
      setOptionValueWithSource(key, value, source) {
        if (this._storeOptionsAsProperties) {
          this[key] = value;
        } else {
          this._optionValues[key] = value;
        }
        this._optionValueSources[key] = source;
        return this;
      }
      /**
       * Get source of option value.
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSource(key) {
        return this._optionValueSources[key];
      }
      /**
       * Get source of option value. See also .optsWithGlobals().
       * Expected values are default | config | env | cli | implied
       *
       * @param {string} key
       * @return {string}
       */
      getOptionValueSourceWithGlobals(key) {
        let source;
        this._getCommandAndAncestors().forEach((cmd) => {
          if (cmd.getOptionValueSource(key) !== void 0) {
            source = cmd.getOptionValueSource(key);
          }
        });
        return source;
      }
      /**
       * Get user arguments from implied or explicit arguments.
       * Side-effects: set _scriptPath if args included script. Used for default program name, and subcommand searches.
       *
       * @private
       */
      _prepareUserArgs(argv, parseOptions) {
        if (argv !== void 0 && !Array.isArray(argv)) {
          throw new Error("first parameter to parse must be array or undefined");
        }
        parseOptions = parseOptions || {};
        if (argv === void 0 && parseOptions.from === void 0) {
          if (process3.versions?.electron) {
            parseOptions.from = "electron";
          }
          const execArgv = process3.execArgv ?? [];
          if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
            parseOptions.from = "eval";
          }
        }
        if (argv === void 0) {
          argv = process3.argv;
        }
        this.rawArgs = argv.slice();
        let userArgs;
        switch (parseOptions.from) {
          case void 0:
          case "node":
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
            break;
          case "electron":
            if (process3.defaultApp) {
              this._scriptPath = argv[1];
              userArgs = argv.slice(2);
            } else {
              userArgs = argv.slice(1);
            }
            break;
          case "user":
            userArgs = argv.slice(0);
            break;
          case "eval":
            userArgs = argv.slice(1);
            break;
          default:
            throw new Error(
              `unexpected parse option { from: '${parseOptions.from}' }`
            );
        }
        if (!this._name && this._scriptPath)
          this.nameFromFilename(this._scriptPath);
        this._name = this._name || "program";
        return userArgs;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Use parseAsync instead of parse if any of your action handlers are async.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * program.parse(); // parse process.argv and auto-detect electron and special node flags
       * program.parse(process.argv); // assume argv[0] is app and argv[1] is script
       * program.parse(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv] - optional, defaults to process.argv
       * @param {object} [parseOptions] - optionally specify style of options with from: node/user/electron
       * @param {string} [parseOptions.from] - where the args are from: 'node', 'user', 'electron'
       * @return {Command} `this` command for chaining
       */
      parse(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Parse `argv`, setting options and invoking commands when defined.
       *
       * Call with no parameters to parse `process.argv`. Detects Electron and special node options like `node --eval`. Easy mode!
       *
       * Or call with an array of strings to parse, and optionally where the user arguments start by specifying where the arguments are `from`:
       * - `'node'`: default, `argv[0]` is the application and `argv[1]` is the script being run, with user arguments after that
       * - `'electron'`: `argv[0]` is the application and `argv[1]` varies depending on whether the electron application is packaged
       * - `'user'`: just user arguments
       *
       * @example
       * await program.parseAsync(); // parse process.argv and auto-detect electron and special node flags
       * await program.parseAsync(process.argv); // assume argv[0] is app and argv[1] is script
       * await program.parseAsync(my-args, { from: 'user' }); // just user supplied arguments, nothing special about argv[0]
       *
       * @param {string[]} [argv]
       * @param {object} [parseOptions]
       * @param {string} parseOptions.from - where the args are from: 'node', 'user', 'electron'
       * @return {Promise}
       */
      async parseAsync(argv, parseOptions) {
        const userArgs = this._prepareUserArgs(argv, parseOptions);
        await this._parseCommand([], userArgs);
        return this;
      }
      /**
       * Execute a sub-command executable.
       *
       * @private
       */
      _executeSubCommand(subcommand, args) {
        args = args.slice();
        let launchWithNode = false;
        const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
        function findFile(baseDir, baseName) {
          const localBin = path.resolve(baseDir, baseName);
          if (fs.existsSync(localBin)) return localBin;
          if (sourceExt.includes(path.extname(baseName))) return void 0;
          const foundExt = sourceExt.find(
            (ext) => fs.existsSync(`${localBin}${ext}`)
          );
          if (foundExt) return `${localBin}${foundExt}`;
          return void 0;
        }
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
        let executableDir = this._executableDir || "";
        if (this._scriptPath) {
          let resolvedScriptPath;
          try {
            resolvedScriptPath = fs.realpathSync(this._scriptPath);
          } catch (err) {
            resolvedScriptPath = this._scriptPath;
          }
          executableDir = path.resolve(
            path.dirname(resolvedScriptPath),
            executableDir
          );
        }
        if (executableDir) {
          let localFile = findFile(executableDir, executableFile);
          if (!localFile && !subcommand._executableFile && this._scriptPath) {
            const legacyName = path.basename(
              this._scriptPath,
              path.extname(this._scriptPath)
            );
            if (legacyName !== this._name) {
              localFile = findFile(
                executableDir,
                `${legacyName}-${subcommand._name}`
              );
            }
          }
          executableFile = localFile || executableFile;
        }
        launchWithNode = sourceExt.includes(path.extname(executableFile));
        let proc;
        if (process3.platform !== "win32") {
          if (launchWithNode) {
            args.unshift(executableFile);
            args = incrementNodeInspectorPort(process3.execArgv).concat(args);
            proc = childProcess.spawn(process3.argv[0], args, { stdio: "inherit" });
          } else {
            proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
          }
        } else {
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process3.execArgv).concat(args);
          proc = childProcess.spawn(process3.execPath, args, { stdio: "inherit" });
        }
        if (!proc.killed) {
          const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
          signals.forEach((signal) => {
            process3.on(signal, () => {
              if (proc.killed === false && proc.exitCode === null) {
                proc.kill(signal);
              }
            });
          });
        }
        const exitCallback = this._exitCallback;
        proc.on("close", (code) => {
          code = code ?? 1;
          if (!exitCallback) {
            process3.exit(code);
          } else {
            exitCallback(
              new CommanderError2(
                code,
                "commander.executeSubCommandAsync",
                "(close)"
              )
            );
          }
        });
        proc.on("error", (err) => {
          if (err.code === "ENOENT") {
            const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
            const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
            throw new Error(executableMissing);
          } else if (err.code === "EACCES") {
            throw new Error(`'${executableFile}' not executable`);
          }
          if (!exitCallback) {
            process3.exit(1);
          } else {
            const wrappedError = new CommanderError2(
              1,
              "commander.executeSubCommandAsync",
              "(error)"
            );
            wrappedError.nestedError = err;
            exitCallback(wrappedError);
          }
        });
        this.runningCommand = proc;
      }
      /**
       * @private
       */
      _dispatchSubcommand(commandName, operands, unknown) {
        const subCommand = this._findCommand(commandName);
        if (!subCommand) this.help({ error: true });
        let promiseChain;
        promiseChain = this._chainOrCallSubCommandHook(
          promiseChain,
          subCommand,
          "preSubcommand"
        );
        promiseChain = this._chainOrCall(promiseChain, () => {
          if (subCommand._executableHandler) {
            this._executeSubCommand(subCommand, operands.concat(unknown));
          } else {
            return subCommand._parseCommand(operands, unknown);
          }
        });
        return promiseChain;
      }
      /**
       * Invoke help directly if possible, or dispatch if necessary.
       * e.g. help foo
       *
       * @private
       */
      _dispatchHelpCommand(subcommandName) {
        if (!subcommandName) {
          this.help();
        }
        const subCommand = this._findCommand(subcommandName);
        if (subCommand && !subCommand._executableHandler) {
          subCommand.help();
        }
        return this._dispatchSubcommand(
          subcommandName,
          [],
          [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]
        );
      }
      /**
       * Check this.args against expected this.registeredArguments.
       *
       * @private
       */
      _checkNumberOfArguments() {
        this.registeredArguments.forEach((arg, i2) => {
          if (arg.required && this.args[i2] == null) {
            this.missingArgument(arg.name());
          }
        });
        if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
          return;
        }
        if (this.args.length > this.registeredArguments.length) {
          this._excessArguments(this.args);
        }
      }
      /**
       * Process this.args using this.registeredArguments and save as this.processedArgs!
       *
       * @private
       */
      _processArguments() {
        const myParseArg = (argument, value, previous) => {
          let parsedValue = value;
          if (value !== null && argument.parseArg) {
            const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
            parsedValue = this._callParseArg(
              argument,
              value,
              previous,
              invalidValueMessage
            );
          }
          return parsedValue;
        };
        this._checkNumberOfArguments();
        const processedArgs = [];
        this.registeredArguments.forEach((declaredArg, index) => {
          let value = declaredArg.defaultValue;
          if (declaredArg.variadic) {
            if (index < this.args.length) {
              value = this.args.slice(index);
              if (declaredArg.parseArg) {
                value = value.reduce((processed, v) => {
                  return myParseArg(declaredArg, v, processed);
                }, declaredArg.defaultValue);
              }
            } else if (value === void 0) {
              value = [];
            }
          } else if (index < this.args.length) {
            value = this.args[index];
            if (declaredArg.parseArg) {
              value = myParseArg(declaredArg, value, declaredArg.defaultValue);
            }
          }
          processedArgs[index] = value;
        });
        this.processedArgs = processedArgs;
      }
      /**
       * Once we have a promise we chain, but call synchronously until then.
       *
       * @param {(Promise|undefined)} promise
       * @param {Function} fn
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCall(promise, fn) {
        if (promise && promise.then && typeof promise.then === "function") {
          return promise.then(() => fn());
        }
        return fn();
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallHooks(promise, event) {
        let result = promise;
        const hooks = [];
        this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== void 0).forEach((hookedCommand) => {
          hookedCommand._lifeCycleHooks[event].forEach((callback) => {
            hooks.push({ hookedCommand, callback });
          });
        });
        if (event === "postAction") {
          hooks.reverse();
        }
        hooks.forEach((hookDetail) => {
          result = this._chainOrCall(result, () => {
            return hookDetail.callback(hookDetail.hookedCommand, this);
          });
        });
        return result;
      }
      /**
       *
       * @param {(Promise|undefined)} promise
       * @param {Command} subCommand
       * @param {string} event
       * @return {(Promise|undefined)}
       * @private
       */
      _chainOrCallSubCommandHook(promise, subCommand, event) {
        let result = promise;
        if (this._lifeCycleHooks[event] !== void 0) {
          this._lifeCycleHooks[event].forEach((hook) => {
            result = this._chainOrCall(result, () => {
              return hook(this, subCommand);
            });
          });
        }
        return result;
      }
      /**
       * Process arguments in context of this command.
       * Returns action result, in case it is a promise.
       *
       * @private
       */
      _parseCommand(operands, unknown) {
        const parsed = this.parseOptions(unknown);
        this._parseOptionsEnv();
        this._parseOptionsImplied();
        operands = operands.concat(parsed.operands);
        unknown = parsed.unknown;
        this.args = operands.concat(unknown);
        if (operands && this._findCommand(operands[0])) {
          return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
        }
        if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
          return this._dispatchHelpCommand(operands[1]);
        }
        if (this._defaultCommandName) {
          this._outputHelpIfRequested(unknown);
          return this._dispatchSubcommand(
            this._defaultCommandName,
            operands,
            unknown
          );
        }
        if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
          this.help({ error: true });
        }
        this._outputHelpIfRequested(parsed.unknown);
        this._checkForMissingMandatoryOptions();
        this._checkForConflictingOptions();
        const checkForUnknownOptions = () => {
          if (parsed.unknown.length > 0) {
            this.unknownOption(parsed.unknown[0]);
          }
        };
        const commandEvent = `command:${this.name()}`;
        if (this._actionHandler) {
          checkForUnknownOptions();
          this._processArguments();
          let promiseChain;
          promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
          promiseChain = this._chainOrCall(
            promiseChain,
            () => this._actionHandler(this.processedArgs)
          );
          if (this.parent) {
            promiseChain = this._chainOrCall(promiseChain, () => {
              this.parent.emit(commandEvent, operands, unknown);
            });
          }
          promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
          return promiseChain;
        }
        if (this.parent && this.parent.listenerCount(commandEvent)) {
          checkForUnknownOptions();
          this._processArguments();
          this.parent.emit(commandEvent, operands, unknown);
        } else if (operands.length) {
          if (this._findCommand("*")) {
            return this._dispatchSubcommand("*", operands, unknown);
          }
          if (this.listenerCount("command:*")) {
            this.emit("command:*", operands, unknown);
          } else if (this.commands.length) {
            this.unknownCommand();
          } else {
            checkForUnknownOptions();
            this._processArguments();
          }
        } else if (this.commands.length) {
          checkForUnknownOptions();
          this.help({ error: true });
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      }
      /**
       * Find matching command.
       *
       * @private
       * @return {Command | undefined}
       */
      _findCommand(name) {
        if (!name) return void 0;
        return this.commands.find(
          (cmd) => cmd._name === name || cmd._aliases.includes(name)
        );
      }
      /**
       * Return an option matching `arg` if any.
       *
       * @param {string} arg
       * @return {Option}
       * @package
       */
      _findOption(arg) {
        return this.options.find((option) => option.is(arg));
      }
      /**
       * Display an error message if a mandatory option does not have a value.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForMissingMandatoryOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd.options.forEach((anOption) => {
            if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === void 0) {
              cmd.missingMandatoryOptionValue(anOption);
            }
          });
        });
      }
      /**
       * Display an error message if conflicting options are used together in this.
       *
       * @private
       */
      _checkForConflictingLocalOptions() {
        const definedNonDefaultOptions = this.options.filter((option) => {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === void 0) {
            return false;
          }
          return this.getOptionValueSource(optionKey) !== "default";
        });
        const optionsWithConflicting = definedNonDefaultOptions.filter(
          (option) => option.conflictsWith.length > 0
        );
        optionsWithConflicting.forEach((option) => {
          const conflictingAndDefined = definedNonDefaultOptions.find(
            (defined) => option.conflictsWith.includes(defined.attributeName())
          );
          if (conflictingAndDefined) {
            this._conflictingOption(option, conflictingAndDefined);
          }
        });
      }
      /**
       * Display an error message if conflicting options are used together.
       * Called after checking for help flags in leaf subcommand.
       *
       * @private
       */
      _checkForConflictingOptions() {
        this._getCommandAndAncestors().forEach((cmd) => {
          cmd._checkForConflictingLocalOptions();
        });
      }
      /**
       * Parse options from `argv` removing known options,
       * and return argv split into operands and unknown arguments.
       *
       * Examples:
       *
       *     argv => operands, unknown
       *     --known kkk op => [op], []
       *     op --known kkk => [op], []
       *     sub --unknown uuu op => [sub], [--unknown uuu op]
       *     sub -- --unknown uuu op => [sub --unknown uuu op], []
       *
       * @param {string[]} argv
       * @return {{operands: string[], unknown: string[]}}
       */
      parseOptions(argv) {
        const operands = [];
        const unknown = [];
        let dest = operands;
        const args = argv.slice();
        function maybeOption(arg) {
          return arg.length > 1 && arg[0] === "-";
        }
        let activeVariadicOption = null;
        while (args.length) {
          const arg = args.shift();
          if (arg === "--") {
            if (dest === unknown) dest.push(arg);
            dest.push(...args);
            break;
          }
          if (activeVariadicOption && !maybeOption(arg)) {
            this.emit(`option:${activeVariadicOption.name()}`, arg);
            continue;
          }
          activeVariadicOption = null;
          if (maybeOption(arg)) {
            const option = this._findOption(arg);
            if (option) {
              if (option.required) {
                const value = args.shift();
                if (value === void 0) this.optionMissingArgument(option);
                this.emit(`option:${option.name()}`, value);
              } else if (option.optional) {
                let value = null;
                if (args.length > 0 && !maybeOption(args[0])) {
                  value = args.shift();
                }
                this.emit(`option:${option.name()}`, value);
              } else {
                this.emit(`option:${option.name()}`);
              }
              activeVariadicOption = option.variadic ? option : null;
              continue;
            }
          }
          if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
            const option = this._findOption(`-${arg[1]}`);
            if (option) {
              if (option.required || option.optional && this._combineFlagAndOptionalValue) {
                this.emit(`option:${option.name()}`, arg.slice(2));
              } else {
                this.emit(`option:${option.name()}`);
                args.unshift(`-${arg.slice(2)}`);
              }
              continue;
            }
          }
          if (/^--[^=]+=/.test(arg)) {
            const index = arg.indexOf("=");
            const option = this._findOption(arg.slice(0, index));
            if (option && (option.required || option.optional)) {
              this.emit(`option:${option.name()}`, arg.slice(index + 1));
              continue;
            }
          }
          if (maybeOption(arg)) {
            dest = unknown;
          }
          if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
            if (this._findCommand(arg)) {
              operands.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
              operands.push(arg);
              if (args.length > 0) operands.push(...args);
              break;
            } else if (this._defaultCommandName) {
              unknown.push(arg);
              if (args.length > 0) unknown.push(...args);
              break;
            }
          }
          if (this._passThroughOptions) {
            dest.push(arg);
            if (args.length > 0) dest.push(...args);
            break;
          }
          dest.push(arg);
        }
        return { operands, unknown };
      }
      /**
       * Return an object containing local option values as key-value pairs.
       *
       * @return {object}
       */
      opts() {
        if (this._storeOptionsAsProperties) {
          const result = {};
          const len = this.options.length;
          for (let i2 = 0; i2 < len; i2++) {
            const key = this.options[i2].attributeName();
            result[key] = key === this._versionOptionName ? this._version : this[key];
          }
          return result;
        }
        return this._optionValues;
      }
      /**
       * Return an object containing merged local and global option values as key-value pairs.
       *
       * @return {object}
       */
      optsWithGlobals() {
        return this._getCommandAndAncestors().reduce(
          (combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()),
          {}
        );
      }
      /**
       * Display error message and exit (or call exitOverride).
       *
       * @param {string} message
       * @param {object} [errorOptions]
       * @param {string} [errorOptions.code] - an id string representing the error
       * @param {number} [errorOptions.exitCode] - used with process.exit
       */
      error(message, errorOptions) {
        this._outputConfiguration.outputError(
          `${message}
`,
          this._outputConfiguration.writeErr
        );
        if (typeof this._showHelpAfterError === "string") {
          this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
        } else if (this._showHelpAfterError) {
          this._outputConfiguration.writeErr("\n");
          this.outputHelp({ error: true });
        }
        const config = errorOptions || {};
        const exitCode = config.exitCode || 1;
        const code = config.code || "commander.error";
        this._exit(exitCode, code, message);
      }
      /**
       * Apply any option related environment variables, if option does
       * not have a value from cli or client code.
       *
       * @private
       */
      _parseOptionsEnv() {
        this.options.forEach((option) => {
          if (option.envVar && option.envVar in process3.env) {
            const optionKey = option.attributeName();
            if (this.getOptionValue(optionKey) === void 0 || ["default", "config", "env"].includes(
              this.getOptionValueSource(optionKey)
            )) {
              if (option.required || option.optional) {
                this.emit(`optionEnv:${option.name()}`, process3.env[option.envVar]);
              } else {
                this.emit(`optionEnv:${option.name()}`);
              }
            }
          }
        });
      }
      /**
       * Apply any implied option values, if option is undefined or default value.
       *
       * @private
       */
      _parseOptionsImplied() {
        const dualHelper = new DualOptions(this.options);
        const hasCustomOptionValue = (optionKey) => {
          return this.getOptionValue(optionKey) !== void 0 && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
        };
        this.options.filter(
          (option) => option.implied !== void 0 && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(
            this.getOptionValue(option.attributeName()),
            option
          )
        ).forEach((option) => {
          Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
            this.setOptionValueWithSource(
              impliedKey,
              option.implied[impliedKey],
              "implied"
            );
          });
        });
      }
      /**
       * Argument `name` is missing.
       *
       * @param {string} name
       * @private
       */
      missingArgument(name) {
        const message = `error: missing required argument '${name}'`;
        this.error(message, { code: "commander.missingArgument" });
      }
      /**
       * `Option` is missing an argument.
       *
       * @param {Option} option
       * @private
       */
      optionMissingArgument(option) {
        const message = `error: option '${option.flags}' argument missing`;
        this.error(message, { code: "commander.optionMissingArgument" });
      }
      /**
       * `Option` does not have a value, and is a mandatory option.
       *
       * @param {Option} option
       * @private
       */
      missingMandatoryOptionValue(option) {
        const message = `error: required option '${option.flags}' not specified`;
        this.error(message, { code: "commander.missingMandatoryOptionValue" });
      }
      /**
       * `Option` conflicts with another option.
       *
       * @param {Option} option
       * @param {Option} conflictingOption
       * @private
       */
      _conflictingOption(option, conflictingOption) {
        const findBestOptionFromValue = (option2) => {
          const optionKey = option2.attributeName();
          const optionValue = this.getOptionValue(optionKey);
          const negativeOption = this.options.find(
            (target) => target.negate && optionKey === target.attributeName()
          );
          const positiveOption = this.options.find(
            (target) => !target.negate && optionKey === target.attributeName()
          );
          if (negativeOption && (negativeOption.presetArg === void 0 && optionValue === false || negativeOption.presetArg !== void 0 && optionValue === negativeOption.presetArg)) {
            return negativeOption;
          }
          return positiveOption || option2;
        };
        const getErrorMessage2 = (option2) => {
          const bestOption = findBestOptionFromValue(option2);
          const optionKey = bestOption.attributeName();
          const source = this.getOptionValueSource(optionKey);
          if (source === "env") {
            return `environment variable '${bestOption.envVar}'`;
          }
          return `option '${bestOption.flags}'`;
        };
        const message = `error: ${getErrorMessage2(option)} cannot be used with ${getErrorMessage2(conflictingOption)}`;
        this.error(message, { code: "commander.conflictingOption" });
      }
      /**
       * Unknown option `flag`.
       *
       * @param {string} flag
       * @private
       */
      unknownOption(flag) {
        if (this._allowUnknownOption) return;
        let suggestion = "";
        if (flag.startsWith("--") && this._showSuggestionAfterError) {
          let candidateFlags = [];
          let command = this;
          do {
            const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
            candidateFlags = candidateFlags.concat(moreFlags);
            command = command.parent;
          } while (command && !command._enablePositionalOptions);
          suggestion = suggestSimilar(flag, candidateFlags);
        }
        const message = `error: unknown option '${flag}'${suggestion}`;
        this.error(message, { code: "commander.unknownOption" });
      }
      /**
       * Excess arguments, more than expected.
       *
       * @param {string[]} receivedArgs
       * @private
       */
      _excessArguments(receivedArgs) {
        if (this._allowExcessArguments) return;
        const expected = this.registeredArguments.length;
        const s = expected === 1 ? "" : "s";
        const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
        const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
        this.error(message, { code: "commander.excessArguments" });
      }
      /**
       * Unknown command.
       *
       * @private
       */
      unknownCommand() {
        const unknownName = this.args[0];
        let suggestion = "";
        if (this._showSuggestionAfterError) {
          const candidateNames = [];
          this.createHelp().visibleCommands(this).forEach((command) => {
            candidateNames.push(command.name());
            if (command.alias()) candidateNames.push(command.alias());
          });
          suggestion = suggestSimilar(unknownName, candidateNames);
        }
        const message = `error: unknown command '${unknownName}'${suggestion}`;
        this.error(message, { code: "commander.unknownCommand" });
      }
      /**
       * Get or set the program version.
       *
       * This method auto-registers the "-V, --version" option which will print the version number.
       *
       * You can optionally supply the flags and description to override the defaults.
       *
       * @param {string} [str]
       * @param {string} [flags]
       * @param {string} [description]
       * @return {(this | string | undefined)} `this` command for chaining, or version string if no arguments
       */
      version(str2, flags, description) {
        if (str2 === void 0) return this._version;
        this._version = str2;
        flags = flags || "-V, --version";
        description = description || "output the version number";
        const versionOption = this.createOption(flags, description);
        this._versionOptionName = versionOption.attributeName();
        this._registerOption(versionOption);
        this.on("option:" + versionOption.name(), () => {
          this._outputConfiguration.writeOut(`${str2}
`);
          this._exit(0, "commander.version", str2);
        });
        return this;
      }
      /**
       * Set the description.
       *
       * @param {string} [str]
       * @param {object} [argsDescription]
       * @return {(string|Command)}
       */
      description(str2, argsDescription) {
        if (str2 === void 0 && argsDescription === void 0)
          return this._description;
        this._description = str2;
        if (argsDescription) {
          this._argsDescription = argsDescription;
        }
        return this;
      }
      /**
       * Set the summary. Used when listed as subcommand of parent.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      summary(str2) {
        if (str2 === void 0) return this._summary;
        this._summary = str2;
        return this;
      }
      /**
       * Set an alias for the command.
       *
       * You may call more than once to add multiple aliases. Only the first alias is shown in the auto-generated help.
       *
       * @param {string} [alias]
       * @return {(string|Command)}
       */
      alias(alias) {
        if (alias === void 0) return this._aliases[0];
        let command = this;
        if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
          command = this.commands[this.commands.length - 1];
        }
        if (alias === command._name)
          throw new Error("Command alias can't be the same as its name");
        const matchingCommand = this.parent?._findCommand(alias);
        if (matchingCommand) {
          const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
          throw new Error(
            `cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`
          );
        }
        command._aliases.push(alias);
        return this;
      }
      /**
       * Set aliases for the command.
       *
       * Only the first alias is shown in the auto-generated help.
       *
       * @param {string[]} [aliases]
       * @return {(string[]|Command)}
       */
      aliases(aliases) {
        if (aliases === void 0) return this._aliases;
        aliases.forEach((alias) => this.alias(alias));
        return this;
      }
      /**
       * Set / get the command usage `str`.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      usage(str2) {
        if (str2 === void 0) {
          if (this._usage) return this._usage;
          const args = this.registeredArguments.map((arg) => {
            return humanReadableArgName(arg);
          });
          return [].concat(
            this.options.length || this._helpOption !== null ? "[options]" : [],
            this.commands.length ? "[command]" : [],
            this.registeredArguments.length ? args : []
          ).join(" ");
        }
        this._usage = str2;
        return this;
      }
      /**
       * Get or set the name of the command.
       *
       * @param {string} [str]
       * @return {(string|Command)}
       */
      name(str2) {
        if (str2 === void 0) return this._name;
        this._name = str2;
        return this;
      }
      /**
       * Set the name of the command from script filename, such as process.argv[1],
       * or require.main.filename, or __filename.
       *
       * (Used internally and public although not documented in README.)
       *
       * @example
       * program.nameFromFilename(require.main.filename);
       *
       * @param {string} filename
       * @return {Command}
       */
      nameFromFilename(filename) {
        this._name = path.basename(filename, path.extname(filename));
        return this;
      }
      /**
       * Get or set the directory for searching for executable subcommands of this command.
       *
       * @example
       * program.executableDir(__dirname);
       * // or
       * program.executableDir('subcommands');
       *
       * @param {string} [path]
       * @return {(string|null|Command)}
       */
      executableDir(path2) {
        if (path2 === void 0) return this._executableDir;
        this._executableDir = path2;
        return this;
      }
      /**
       * Return program help documentation.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to wrap for stderr instead of stdout
       * @return {string}
       */
      helpInformation(contextOptions) {
        const helper = this.createHelp();
        if (helper.helpWidth === void 0) {
          helper.helpWidth = contextOptions && contextOptions.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
        }
        return helper.formatHelp(this, helper);
      }
      /**
       * @private
       */
      _getHelpContext(contextOptions) {
        contextOptions = contextOptions || {};
        const context = { error: !!contextOptions.error };
        let write;
        if (context.error) {
          write = (arg) => this._outputConfiguration.writeErr(arg);
        } else {
          write = (arg) => this._outputConfiguration.writeOut(arg);
        }
        context.write = contextOptions.write || write;
        context.command = this;
        return context;
      }
      /**
       * Output help information for this command.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean } | Function} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      outputHelp(contextOptions) {
        let deprecatedCallback;
        if (typeof contextOptions === "function") {
          deprecatedCallback = contextOptions;
          contextOptions = void 0;
        }
        const context = this._getHelpContext(contextOptions);
        this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", context));
        this.emit("beforeHelp", context);
        let helpInformation = this.helpInformation(context);
        if (deprecatedCallback) {
          helpInformation = deprecatedCallback(helpInformation);
          if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
            throw new Error("outputHelp callback must return a string or a Buffer");
          }
        }
        context.write(helpInformation);
        if (this._getHelpOption()?.long) {
          this.emit(this._getHelpOption().long);
        }
        this.emit("afterHelp", context);
        this._getCommandAndAncestors().forEach(
          (command) => command.emit("afterAllHelp", context)
        );
      }
      /**
       * You can pass in flags and a description to customise the built-in help option.
       * Pass in false to disable the built-in help option.
       *
       * @example
       * program.helpOption('-?, --help' 'show help'); // customise
       * program.helpOption(false); // disable
       *
       * @param {(string | boolean)} flags
       * @param {string} [description]
       * @return {Command} `this` command for chaining
       */
      helpOption(flags, description) {
        if (typeof flags === "boolean") {
          if (flags) {
            this._helpOption = this._helpOption ?? void 0;
          } else {
            this._helpOption = null;
          }
          return this;
        }
        flags = flags ?? "-h, --help";
        description = description ?? "display help for command";
        this._helpOption = this.createOption(flags, description);
        return this;
      }
      /**
       * Lazy create help option.
       * Returns null if has been disabled with .helpOption(false).
       *
       * @returns {(Option | null)} the help option
       * @package
       */
      _getHelpOption() {
        if (this._helpOption === void 0) {
          this.helpOption(void 0, void 0);
        }
        return this._helpOption;
      }
      /**
       * Supply your own option to use for the built-in help option.
       * This is an alternative to using helpOption() to customise the flags and description etc.
       *
       * @param {Option} option
       * @return {Command} `this` command for chaining
       */
      addHelpOption(option) {
        this._helpOption = option;
        return this;
      }
      /**
       * Output help information and exit.
       *
       * Outputs built-in help, and custom text added using `.addHelpText()`.
       *
       * @param {{ error: boolean }} [contextOptions] - pass {error:true} to write to stderr instead of stdout
       */
      help(contextOptions) {
        this.outputHelp(contextOptions);
        let exitCode = process3.exitCode || 0;
        if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
          exitCode = 1;
        }
        this._exit(exitCode, "commander.help", "(outputHelp)");
      }
      /**
       * Add additional text to be displayed with the built-in help.
       *
       * Position is 'before' or 'after' to affect just this command,
       * and 'beforeAll' or 'afterAll' to affect this command and all its subcommands.
       *
       * @param {string} position - before or after built-in help
       * @param {(string | Function)} text - string to add, or a function returning a string
       * @return {Command} `this` command for chaining
       */
      addHelpText(position, text) {
        const allowedValues = ["beforeAll", "before", "after", "afterAll"];
        if (!allowedValues.includes(position)) {
          throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
        }
        const helpEvent = `${position}Help`;
        this.on(helpEvent, (context) => {
          let helpStr;
          if (typeof text === "function") {
            helpStr = text({ error: context.error, command: context.command });
          } else {
            helpStr = text;
          }
          if (helpStr) {
            context.write(`${helpStr}
`);
          }
        });
        return this;
      }
      /**
       * Output help information if help flags specified
       *
       * @param {Array} args - array of options to search for help flags
       * @private
       */
      _outputHelpIfRequested(args) {
        const helpOption = this._getHelpOption();
        const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
        if (helpRequested) {
          this.outputHelp();
          this._exit(0, "commander.helpDisplayed", "(outputHelp)");
        }
      }
    };
    function incrementNodeInspectorPort(args) {
      return args.map((arg) => {
        if (!arg.startsWith("--inspect")) {
          return arg;
        }
        let debugOption;
        let debugHost = "127.0.0.1";
        let debugPort = "9229";
        let match;
        if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
          debugOption = match[1];
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
          debugOption = match[1];
          if (/^\d+$/.test(match[3])) {
            debugPort = match[3];
          } else {
            debugHost = match[3];
          }
        } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
          debugOption = match[1];
          debugHost = match[3];
          debugPort = match[4];
        }
        if (debugOption && debugPort !== "0") {
          return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
        }
        return arg;
      });
    }
    exports.Command = Command2;
  }
});

// node_modules/commander/index.js
var require_commander = __commonJS({
  "node_modules/commander/index.js"(exports) {
    var { Argument: Argument2 } = require_argument();
    var { Command: Command2 } = require_command();
    var { CommanderError: CommanderError2, InvalidArgumentError: InvalidArgumentError2 } = require_error();
    var { Help: Help2 } = require_help();
    var { Option: Option2 } = require_option();
    exports.program = new Command2();
    exports.createCommand = (name) => new Command2(name);
    exports.createOption = (flags, description) => new Option2(flags, description);
    exports.createArgument = (name, description) => new Argument2(name, description);
    exports.Command = Command2;
    exports.Option = Option2;
    exports.Argument = Argument2;
    exports.Help = Help2;
    exports.CommanderError = CommanderError2;
    exports.InvalidArgumentError = InvalidArgumentError2;
    exports.InvalidOptionArgumentError = InvalidArgumentError2;
  }
});

// node_modules/zod/v3/helpers/util.js
var util, objectUtil, ZodParsedType, getParsedType;
var init_util = __esm({
  "node_modules/zod/v3/helpers/util.js"() {
    (function(util2) {
      util2.assertEqual = (_2) => {
      };
      function assertIs(_arg) {
      }
      util2.assertIs = assertIs;
      function assertNever(_x) {
        throw new Error();
      }
      util2.assertNever = assertNever;
      util2.arrayToEnum = (items) => {
        const obj = {};
        for (const item of items) {
          obj[item] = item;
        }
        return obj;
      };
      util2.getValidEnumValues = (obj) => {
        const validKeys = util2.objectKeys(obj).filter((k2) => typeof obj[obj[k2]] !== "number");
        const filtered = {};
        for (const k2 of validKeys) {
          filtered[k2] = obj[k2];
        }
        return util2.objectValues(filtered);
      };
      util2.objectValues = (obj) => {
        return util2.objectKeys(obj).map(function(e) {
          return obj[e];
        });
      };
      util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
        const keys = [];
        for (const key in object) {
          if (Object.prototype.hasOwnProperty.call(object, key)) {
            keys.push(key);
          }
        }
        return keys;
      };
      util2.find = (arr4, checker) => {
        for (const item of arr4) {
          if (checker(item))
            return item;
        }
        return void 0;
      };
      util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
      function joinValues(array, separator = " | ") {
        return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
      }
      util2.joinValues = joinValues;
      util2.jsonStringifyReplacer = (_2, value) => {
        if (typeof value === "bigint") {
          return value.toString();
        }
        return value;
      };
    })(util || (util = {}));
    (function(objectUtil2) {
      objectUtil2.mergeShapes = (first2, second) => {
        return {
          ...first2,
          ...second
          // second overwrites first
        };
      };
    })(objectUtil || (objectUtil = {}));
    ZodParsedType = util.arrayToEnum([
      "string",
      "nan",
      "number",
      "integer",
      "float",
      "boolean",
      "date",
      "bigint",
      "symbol",
      "function",
      "undefined",
      "null",
      "array",
      "object",
      "unknown",
      "promise",
      "void",
      "never",
      "map",
      "set"
    ]);
    getParsedType = (data) => {
      const t2 = typeof data;
      switch (t2) {
        case "undefined":
          return ZodParsedType.undefined;
        case "string":
          return ZodParsedType.string;
        case "number":
          return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
        case "boolean":
          return ZodParsedType.boolean;
        case "function":
          return ZodParsedType.function;
        case "bigint":
          return ZodParsedType.bigint;
        case "symbol":
          return ZodParsedType.symbol;
        case "object":
          if (Array.isArray(data)) {
            return ZodParsedType.array;
          }
          if (data === null) {
            return ZodParsedType.null;
          }
          if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
            return ZodParsedType.promise;
          }
          if (typeof Map !== "undefined" && data instanceof Map) {
            return ZodParsedType.map;
          }
          if (typeof Set !== "undefined" && data instanceof Set) {
            return ZodParsedType.set;
          }
          if (typeof Date !== "undefined" && data instanceof Date) {
            return ZodParsedType.date;
          }
          return ZodParsedType.object;
        default:
          return ZodParsedType.unknown;
      }
    };
  }
});

// node_modules/zod/v3/ZodError.js
var ZodIssueCode, quotelessJson, ZodError;
var init_ZodError = __esm({
  "node_modules/zod/v3/ZodError.js"() {
    init_util();
    ZodIssueCode = util.arrayToEnum([
      "invalid_type",
      "invalid_literal",
      "custom",
      "invalid_union",
      "invalid_union_discriminator",
      "invalid_enum_value",
      "unrecognized_keys",
      "invalid_arguments",
      "invalid_return_type",
      "invalid_date",
      "invalid_string",
      "too_small",
      "too_big",
      "invalid_intersection_types",
      "not_multiple_of",
      "not_finite"
    ]);
    quotelessJson = (obj) => {
      const json = JSON.stringify(obj, null, 2);
      return json.replace(/"([^"]+)":/g, "$1:");
    };
    ZodError = class _ZodError extends Error {
      get errors() {
        return this.issues;
      }
      constructor(issues) {
        super();
        this.issues = [];
        this.addIssue = (sub) => {
          this.issues = [...this.issues, sub];
        };
        this.addIssues = (subs = []) => {
          this.issues = [...this.issues, ...subs];
        };
        const actualProto = new.target.prototype;
        if (Object.setPrototypeOf) {
          Object.setPrototypeOf(this, actualProto);
        } else {
          this.__proto__ = actualProto;
        }
        this.name = "ZodError";
        this.issues = issues;
      }
      format(_mapper) {
        const mapper = _mapper || function(issue) {
          return issue.message;
        };
        const fieldErrors = { _errors: [] };
        const processError = (error) => {
          for (const issue of error.issues) {
            if (issue.code === "invalid_union") {
              issue.unionErrors.map(processError);
            } else if (issue.code === "invalid_return_type") {
              processError(issue.returnTypeError);
            } else if (issue.code === "invalid_arguments") {
              processError(issue.argumentsError);
            } else if (issue.path.length === 0) {
              fieldErrors._errors.push(mapper(issue));
            } else {
              let curr = fieldErrors;
              let i2 = 0;
              while (i2 < issue.path.length) {
                const el = issue.path[i2];
                const terminal = i2 === issue.path.length - 1;
                if (!terminal) {
                  curr[el] = curr[el] || { _errors: [] };
                } else {
                  curr[el] = curr[el] || { _errors: [] };
                  curr[el]._errors.push(mapper(issue));
                }
                curr = curr[el];
                i2++;
              }
            }
          }
        };
        processError(this);
        return fieldErrors;
      }
      static assert(value) {
        if (!(value instanceof _ZodError)) {
          throw new Error(`Not a ZodError: ${value}`);
        }
      }
      toString() {
        return this.message;
      }
      get message() {
        return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
      }
      get isEmpty() {
        return this.issues.length === 0;
      }
      flatten(mapper = (issue) => issue.message) {
        const fieldErrors = {};
        const formErrors = [];
        for (const sub of this.issues) {
          if (sub.path.length > 0) {
            const firstEl = sub.path[0];
            fieldErrors[firstEl] = fieldErrors[firstEl] || [];
            fieldErrors[firstEl].push(mapper(sub));
          } else {
            formErrors.push(mapper(sub));
          }
        }
        return { formErrors, fieldErrors };
      }
      get formErrors() {
        return this.flatten();
      }
    };
    ZodError.create = (issues) => {
      const error = new ZodError(issues);
      return error;
    };
  }
});

// node_modules/zod/v3/locales/en.js
var errorMap, en_default;
var init_en = __esm({
  "node_modules/zod/v3/locales/en.js"() {
    init_ZodError();
    init_util();
    errorMap = (issue, _ctx) => {
      let message;
      switch (issue.code) {
        case ZodIssueCode.invalid_type:
          if (issue.received === ZodParsedType.undefined) {
            message = "Required";
          } else {
            message = `Expected ${issue.expected}, received ${issue.received}`;
          }
          break;
        case ZodIssueCode.invalid_literal:
          message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
          break;
        case ZodIssueCode.unrecognized_keys:
          message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
          break;
        case ZodIssueCode.invalid_union:
          message = `Invalid input`;
          break;
        case ZodIssueCode.invalid_union_discriminator:
          message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
          break;
        case ZodIssueCode.invalid_enum_value:
          message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
          break;
        case ZodIssueCode.invalid_arguments:
          message = `Invalid function arguments`;
          break;
        case ZodIssueCode.invalid_return_type:
          message = `Invalid function return type`;
          break;
        case ZodIssueCode.invalid_date:
          message = `Invalid date`;
          break;
        case ZodIssueCode.invalid_string:
          if (typeof issue.validation === "object") {
            if ("includes" in issue.validation) {
              message = `Invalid input: must include "${issue.validation.includes}"`;
              if (typeof issue.validation.position === "number") {
                message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
              }
            } else if ("startsWith" in issue.validation) {
              message = `Invalid input: must start with "${issue.validation.startsWith}"`;
            } else if ("endsWith" in issue.validation) {
              message = `Invalid input: must end with "${issue.validation.endsWith}"`;
            } else {
              util.assertNever(issue.validation);
            }
          } else if (issue.validation !== "regex") {
            message = `Invalid ${issue.validation}`;
          } else {
            message = "Invalid";
          }
          break;
        case ZodIssueCode.too_small:
          if (issue.type === "array")
            message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
          else if (issue.type === "string")
            message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
          else if (issue.type === "number")
            message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
          else if (issue.type === "bigint")
            message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
          else if (issue.type === "date")
            message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
          else
            message = "Invalid input";
          break;
        case ZodIssueCode.too_big:
          if (issue.type === "array")
            message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
          else if (issue.type === "string")
            message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
          else if (issue.type === "number")
            message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
          else if (issue.type === "bigint")
            message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
          else if (issue.type === "date")
            message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
          else
            message = "Invalid input";
          break;
        case ZodIssueCode.custom:
          message = `Invalid input`;
          break;
        case ZodIssueCode.invalid_intersection_types:
          message = `Intersection results could not be merged`;
          break;
        case ZodIssueCode.not_multiple_of:
          message = `Number must be a multiple of ${issue.multipleOf}`;
          break;
        case ZodIssueCode.not_finite:
          message = "Number must be finite";
          break;
        default:
          message = _ctx.defaultError;
          util.assertNever(issue);
      }
      return { message };
    };
    en_default = errorMap;
  }
});

// node_modules/zod/v3/errors.js
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
var overrideErrorMap;
var init_errors = __esm({
  "node_modules/zod/v3/errors.js"() {
    init_en();
    overrideErrorMap = en_default;
  }
});

// node_modules/zod/v3/helpers/parseUtil.js
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x2) => !!x2)
  });
  ctx.common.issues.push(issue);
}
var makeIssue, EMPTY_PATH, ParseStatus, INVALID, DIRTY, OK, isAborted, isDirty, isValid, isAsync;
var init_parseUtil = __esm({
  "node_modules/zod/v3/helpers/parseUtil.js"() {
    init_errors();
    init_en();
    makeIssue = (params) => {
      const { data, path, errorMaps, issueData } = params;
      const fullPath = [...path, ...issueData.path || []];
      const fullIssue = {
        ...issueData,
        path: fullPath
      };
      if (issueData.message !== void 0) {
        return {
          ...issueData,
          path: fullPath,
          message: issueData.message
        };
      }
      let errorMessage = "";
      const maps = errorMaps.filter((m) => !!m).slice().reverse();
      for (const map of maps) {
        errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
      }
      return {
        ...issueData,
        path: fullPath,
        message: errorMessage
      };
    };
    EMPTY_PATH = [];
    ParseStatus = class _ParseStatus {
      constructor() {
        this.value = "valid";
      }
      dirty() {
        if (this.value === "valid")
          this.value = "dirty";
      }
      abort() {
        if (this.value !== "aborted")
          this.value = "aborted";
      }
      static mergeArray(status, results) {
        const arrayValue = [];
        for (const s of results) {
          if (s.status === "aborted")
            return INVALID;
          if (s.status === "dirty")
            status.dirty();
          arrayValue.push(s.value);
        }
        return { status: status.value, value: arrayValue };
      }
      static async mergeObjectAsync(status, pairs) {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value
          });
        }
        return _ParseStatus.mergeObjectSync(status, syncPairs);
      }
      static mergeObjectSync(status, pairs) {
        const finalObject = {};
        for (const pair of pairs) {
          const { key, value } = pair;
          if (key.status === "aborted")
            return INVALID;
          if (value.status === "aborted")
            return INVALID;
          if (key.status === "dirty")
            status.dirty();
          if (value.status === "dirty")
            status.dirty();
          if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
            finalObject[key.value] = value.value;
          }
        }
        return { status: status.value, value: finalObject };
      }
    };
    INVALID = Object.freeze({
      status: "aborted"
    });
    DIRTY = (value) => ({ status: "dirty", value });
    OK = (value) => ({ status: "valid", value });
    isAborted = (x2) => x2.status === "aborted";
    isDirty = (x2) => x2.status === "dirty";
    isValid = (x2) => x2.status === "valid";
    isAsync = (x2) => typeof Promise !== "undefined" && x2 instanceof Promise;
  }
});

// node_modules/zod/v3/helpers/typeAliases.js
var init_typeAliases = __esm({
  "node_modules/zod/v3/helpers/typeAliases.js"() {
  }
});

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
var init_errorUtil = __esm({
  "node_modules/zod/v3/helpers/errorUtil.js"() {
    (function(errorUtil2) {
      errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
      errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
    })(errorUtil || (errorUtil = {}));
  }
});

// node_modules/zod/v3/types.js
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
function mergeValues(a, b2) {
  const aType = getParsedType(a);
  const bType = getParsedType(b2);
  if (a === b2) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b2);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b2 };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b2[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b2.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b2[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b2) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
function cleanParams(params, data) {
  const p2 = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p22 = typeof p2 === "string" ? { message: p2 } : p2;
  return p22;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r2 = check(data);
      if (r2 instanceof Promise) {
        return r2.then((r3) => {
          if (!r3) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r2) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var ParseInputLazyPath, handleResult, ZodType, cuidRegex, cuid2Regex, ulidRegex, uuidRegex, nanoidRegex, jwtRegex, durationRegex, emailRegex, _emojiRegex, emojiRegex, ipv4Regex, ipv4CidrRegex, ipv6Regex, ipv6CidrRegex, base64Regex, base64urlRegex, dateRegexSource, dateRegex, ZodString, ZodNumber, ZodBigInt, ZodBoolean, ZodDate, ZodSymbol, ZodUndefined, ZodNull, ZodAny, ZodUnknown, ZodNever, ZodVoid, ZodArray, ZodObject, ZodUnion, getDiscriminator, ZodDiscriminatedUnion, ZodIntersection, ZodTuple, ZodRecord, ZodMap, ZodSet, ZodFunction, ZodLazy, ZodLiteral, ZodEnum, ZodNativeEnum, ZodPromise, ZodEffects, ZodOptional, ZodNullable, ZodDefault, ZodCatch, ZodNaN, BRAND, ZodBranded, ZodPipeline, ZodReadonly, late, ZodFirstPartyTypeKind, instanceOfType, stringType, numberType, nanType, bigIntType, booleanType, dateType, symbolType, undefinedType, nullType, anyType, unknownType, neverType, voidType, arrayType, objectType, strictObjectType, unionType, discriminatedUnionType, intersectionType, tupleType, recordType, mapType, setType, functionType, lazyType, literalType, enumType, nativeEnumType, promiseType, effectsType, optionalType, nullableType, preprocessType, pipelineType, ostring, onumber, oboolean, coerce, NEVER;
var init_types = __esm({
  "node_modules/zod/v3/types.js"() {
    init_ZodError();
    init_errors();
    init_errorUtil();
    init_parseUtil();
    init_util();
    ParseInputLazyPath = class {
      constructor(parent, value, path, key) {
        this._cachedPath = [];
        this.parent = parent;
        this.data = value;
        this._path = path;
        this._key = key;
      }
      get path() {
        if (!this._cachedPath.length) {
          if (Array.isArray(this._key)) {
            this._cachedPath.push(...this._path, ...this._key);
          } else {
            this._cachedPath.push(...this._path, this._key);
          }
        }
        return this._cachedPath;
      }
    };
    handleResult = (ctx, result) => {
      if (isValid(result)) {
        return { success: true, data: result.value };
      } else {
        if (!ctx.common.issues.length) {
          throw new Error("Validation failed but no issues detected.");
        }
        return {
          success: false,
          get error() {
            if (this._error)
              return this._error;
            const error = new ZodError(ctx.common.issues);
            this._error = error;
            return this._error;
          }
        };
      }
    };
    ZodType = class {
      get description() {
        return this._def.description;
      }
      _getType(input) {
        return getParsedType(input.data);
      }
      _getOrReturnCtx(input, ctx) {
        return ctx || {
          common: input.parent.common,
          data: input.data,
          parsedType: getParsedType(input.data),
          schemaErrorMap: this._def.errorMap,
          path: input.path,
          parent: input.parent
        };
      }
      _processInputParams(input) {
        return {
          status: new ParseStatus(),
          ctx: {
            common: input.parent.common,
            data: input.data,
            parsedType: getParsedType(input.data),
            schemaErrorMap: this._def.errorMap,
            path: input.path,
            parent: input.parent
          }
        };
      }
      _parseSync(input) {
        const result = this._parse(input);
        if (isAsync(result)) {
          throw new Error("Synchronous parse encountered promise.");
        }
        return result;
      }
      _parseAsync(input) {
        const result = this._parse(input);
        return Promise.resolve(result);
      }
      parse(data, params) {
        const result = this.safeParse(data, params);
        if (result.success)
          return result.data;
        throw result.error;
      }
      safeParse(data, params) {
        const ctx = {
          common: {
            issues: [],
            async: params?.async ?? false,
            contextualErrorMap: params?.errorMap
          },
          path: params?.path || [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: getParsedType(data)
        };
        const result = this._parseSync({ data, path: ctx.path, parent: ctx });
        return handleResult(ctx, result);
      }
      "~validate"(data) {
        const ctx = {
          common: {
            issues: [],
            async: !!this["~standard"].async
          },
          path: [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: getParsedType(data)
        };
        if (!this["~standard"].async) {
          try {
            const result = this._parseSync({ data, path: [], parent: ctx });
            return isValid(result) ? {
              value: result.value
            } : {
              issues: ctx.common.issues
            };
          } catch (err) {
            if (err?.message?.toLowerCase()?.includes("encountered")) {
              this["~standard"].async = true;
            }
            ctx.common = {
              issues: [],
              async: true
            };
          }
        }
        return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        });
      }
      async parseAsync(data, params) {
        const result = await this.safeParseAsync(data, params);
        if (result.success)
          return result.data;
        throw result.error;
      }
      async safeParseAsync(data, params) {
        const ctx = {
          common: {
            issues: [],
            contextualErrorMap: params?.errorMap,
            async: true
          },
          path: params?.path || [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data,
          parsedType: getParsedType(data)
        };
        const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
        const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
        return handleResult(ctx, result);
      }
      refine(check, message) {
        const getIssueProperties = (val) => {
          if (typeof message === "string" || typeof message === "undefined") {
            return { message };
          } else if (typeof message === "function") {
            return message(val);
          } else {
            return message;
          }
        };
        return this._refinement((val, ctx) => {
          const result = check(val);
          const setError = () => ctx.addIssue({
            code: ZodIssueCode.custom,
            ...getIssueProperties(val)
          });
          if (typeof Promise !== "undefined" && result instanceof Promise) {
            return result.then((data) => {
              if (!data) {
                setError();
                return false;
              } else {
                return true;
              }
            });
          }
          if (!result) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      refinement(check, refinementData) {
        return this._refinement((val, ctx) => {
          if (!check(val)) {
            ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
            return false;
          } else {
            return true;
          }
        });
      }
      _refinement(refinement) {
        return new ZodEffects({
          schema: this,
          typeName: ZodFirstPartyTypeKind.ZodEffects,
          effect: { type: "refinement", refinement }
        });
      }
      superRefine(refinement) {
        return this._refinement(refinement);
      }
      constructor(def) {
        this.spa = this.safeParseAsync;
        this._def = def;
        this.parse = this.parse.bind(this);
        this.safeParse = this.safeParse.bind(this);
        this.parseAsync = this.parseAsync.bind(this);
        this.safeParseAsync = this.safeParseAsync.bind(this);
        this.spa = this.spa.bind(this);
        this.refine = this.refine.bind(this);
        this.refinement = this.refinement.bind(this);
        this.superRefine = this.superRefine.bind(this);
        this.optional = this.optional.bind(this);
        this.nullable = this.nullable.bind(this);
        this.nullish = this.nullish.bind(this);
        this.array = this.array.bind(this);
        this.promise = this.promise.bind(this);
        this.or = this.or.bind(this);
        this.and = this.and.bind(this);
        this.transform = this.transform.bind(this);
        this.brand = this.brand.bind(this);
        this.default = this.default.bind(this);
        this.catch = this.catch.bind(this);
        this.describe = this.describe.bind(this);
        this.pipe = this.pipe.bind(this);
        this.readonly = this.readonly.bind(this);
        this.isNullable = this.isNullable.bind(this);
        this.isOptional = this.isOptional.bind(this);
        this["~standard"] = {
          version: 1,
          vendor: "zod",
          validate: (data) => this["~validate"](data)
        };
      }
      optional() {
        return ZodOptional.create(this, this._def);
      }
      nullable() {
        return ZodNullable.create(this, this._def);
      }
      nullish() {
        return this.nullable().optional();
      }
      array() {
        return ZodArray.create(this);
      }
      promise() {
        return ZodPromise.create(this, this._def);
      }
      or(option) {
        return ZodUnion.create([this, option], this._def);
      }
      and(incoming) {
        return ZodIntersection.create(this, incoming, this._def);
      }
      transform(transform) {
        return new ZodEffects({
          ...processCreateParams(this._def),
          schema: this,
          typeName: ZodFirstPartyTypeKind.ZodEffects,
          effect: { type: "transform", transform }
        });
      }
      default(def) {
        const defaultValueFunc = typeof def === "function" ? def : () => def;
        return new ZodDefault({
          ...processCreateParams(this._def),
          innerType: this,
          defaultValue: defaultValueFunc,
          typeName: ZodFirstPartyTypeKind.ZodDefault
        });
      }
      brand() {
        return new ZodBranded({
          typeName: ZodFirstPartyTypeKind.ZodBranded,
          type: this,
          ...processCreateParams(this._def)
        });
      }
      catch(def) {
        const catchValueFunc = typeof def === "function" ? def : () => def;
        return new ZodCatch({
          ...processCreateParams(this._def),
          innerType: this,
          catchValue: catchValueFunc,
          typeName: ZodFirstPartyTypeKind.ZodCatch
        });
      }
      describe(description) {
        const This = this.constructor;
        return new This({
          ...this._def,
          description
        });
      }
      pipe(target) {
        return ZodPipeline.create(this, target);
      }
      readonly() {
        return ZodReadonly.create(this);
      }
      isOptional() {
        return this.safeParse(void 0).success;
      }
      isNullable() {
        return this.safeParse(null).success;
      }
    };
    cuidRegex = /^c[^\s-]{8,}$/i;
    cuid2Regex = /^[0-9a-z]+$/;
    ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
    uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
    nanoidRegex = /^[a-z0-9_-]{21}$/i;
    jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
    emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
    _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
    ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
    ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
    ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
    base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
    base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
    dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
    dateRegex = new RegExp(`^${dateRegexSource}$`);
    ZodString = class _ZodString extends ZodType {
      _parse(input) {
        if (this._def.coerce) {
          input.data = String(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.string) {
          const ctx2 = this._getOrReturnCtx(input);
          addIssueToContext(ctx2, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.string,
            received: ctx2.parsedType
          });
          return INVALID;
        }
        const status = new ParseStatus();
        let ctx = void 0;
        for (const check of this._def.checks) {
          if (check.kind === "min") {
            if (input.data.length < check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check.value,
                type: "string",
                inclusive: true,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            if (input.data.length > check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check.value,
                type: "string",
                inclusive: true,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "length") {
            const tooBig = input.data.length > check.value;
            const tooSmall = input.data.length < check.value;
            if (tooBig || tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              if (tooBig) {
                addIssueToContext(ctx, {
                  code: ZodIssueCode.too_big,
                  maximum: check.value,
                  type: "string",
                  inclusive: true,
                  exact: true,
                  message: check.message
                });
              } else if (tooSmall) {
                addIssueToContext(ctx, {
                  code: ZodIssueCode.too_small,
                  minimum: check.value,
                  type: "string",
                  inclusive: true,
                  exact: true,
                  message: check.message
                });
              }
              status.dirty();
            }
          } else if (check.kind === "email") {
            if (!emailRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "email",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "emoji") {
            if (!emojiRegex) {
              emojiRegex = new RegExp(_emojiRegex, "u");
            }
            if (!emojiRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "emoji",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "uuid") {
            if (!uuidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "uuid",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "nanoid") {
            if (!nanoidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "nanoid",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "cuid") {
            if (!cuidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "cuid",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "cuid2") {
            if (!cuid2Regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "cuid2",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "ulid") {
            if (!ulidRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "ulid",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "url") {
            try {
              new URL(input.data);
            } catch {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "url",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "regex") {
            check.regex.lastIndex = 0;
            const testResult = check.regex.test(input.data);
            if (!testResult) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "regex",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "trim") {
            input.data = input.data.trim();
          } else if (check.kind === "includes") {
            if (!input.data.includes(check.value, check.position)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: { includes: check.value, position: check.position },
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "toLowerCase") {
            input.data = input.data.toLowerCase();
          } else if (check.kind === "toUpperCase") {
            input.data = input.data.toUpperCase();
          } else if (check.kind === "startsWith") {
            if (!input.data.startsWith(check.value)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: { startsWith: check.value },
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "endsWith") {
            if (!input.data.endsWith(check.value)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: { endsWith: check.value },
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "datetime") {
            const regex = datetimeRegex(check);
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: "datetime",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "date") {
            const regex = dateRegex;
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: "date",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "time") {
            const regex = timeRegex(check);
            if (!regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_string,
                validation: "time",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "duration") {
            if (!durationRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "duration",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "ip") {
            if (!isValidIP(input.data, check.version)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "ip",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "jwt") {
            if (!isValidJWT(input.data, check.alg)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "jwt",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "cidr") {
            if (!isValidCidr(input.data, check.version)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "cidr",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "base64") {
            if (!base64Regex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "base64",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "base64url") {
            if (!base64urlRegex.test(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                validation: "base64url",
                code: ZodIssueCode.invalid_string,
                message: check.message
              });
              status.dirty();
            }
          } else {
            util.assertNever(check);
          }
        }
        return { status: status.value, value: input.data };
      }
      _regex(regex, validation, message) {
        return this.refinement((data) => regex.test(data), {
          validation,
          code: ZodIssueCode.invalid_string,
          ...errorUtil.errToObj(message)
        });
      }
      _addCheck(check) {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      email(message) {
        return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
      }
      url(message) {
        return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
      }
      emoji(message) {
        return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
      }
      uuid(message) {
        return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
      }
      nanoid(message) {
        return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
      }
      cuid(message) {
        return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
      }
      cuid2(message) {
        return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
      }
      ulid(message) {
        return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
      }
      base64(message) {
        return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
      }
      base64url(message) {
        return this._addCheck({
          kind: "base64url",
          ...errorUtil.errToObj(message)
        });
      }
      jwt(options) {
        return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
      }
      ip(options) {
        return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
      }
      cidr(options) {
        return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
      }
      datetime(options) {
        if (typeof options === "string") {
          return this._addCheck({
            kind: "datetime",
            precision: null,
            offset: false,
            local: false,
            message: options
          });
        }
        return this._addCheck({
          kind: "datetime",
          precision: typeof options?.precision === "undefined" ? null : options?.precision,
          offset: options?.offset ?? false,
          local: options?.local ?? false,
          ...errorUtil.errToObj(options?.message)
        });
      }
      date(message) {
        return this._addCheck({ kind: "date", message });
      }
      time(options) {
        if (typeof options === "string") {
          return this._addCheck({
            kind: "time",
            precision: null,
            message: options
          });
        }
        return this._addCheck({
          kind: "time",
          precision: typeof options?.precision === "undefined" ? null : options?.precision,
          ...errorUtil.errToObj(options?.message)
        });
      }
      duration(message) {
        return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
      }
      regex(regex, message) {
        return this._addCheck({
          kind: "regex",
          regex,
          ...errorUtil.errToObj(message)
        });
      }
      includes(value, options) {
        return this._addCheck({
          kind: "includes",
          value,
          position: options?.position,
          ...errorUtil.errToObj(options?.message)
        });
      }
      startsWith(value, message) {
        return this._addCheck({
          kind: "startsWith",
          value,
          ...errorUtil.errToObj(message)
        });
      }
      endsWith(value, message) {
        return this._addCheck({
          kind: "endsWith",
          value,
          ...errorUtil.errToObj(message)
        });
      }
      min(minLength, message) {
        return this._addCheck({
          kind: "min",
          value: minLength,
          ...errorUtil.errToObj(message)
        });
      }
      max(maxLength, message) {
        return this._addCheck({
          kind: "max",
          value: maxLength,
          ...errorUtil.errToObj(message)
        });
      }
      length(len, message) {
        return this._addCheck({
          kind: "length",
          value: len,
          ...errorUtil.errToObj(message)
        });
      }
      /**
       * Equivalent to `.min(1)`
       */
      nonempty(message) {
        return this.min(1, errorUtil.errToObj(message));
      }
      trim() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "trim" }]
        });
      }
      toLowerCase() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "toLowerCase" }]
        });
      }
      toUpperCase() {
        return new _ZodString({
          ...this._def,
          checks: [...this._def.checks, { kind: "toUpperCase" }]
        });
      }
      get isDatetime() {
        return !!this._def.checks.find((ch) => ch.kind === "datetime");
      }
      get isDate() {
        return !!this._def.checks.find((ch) => ch.kind === "date");
      }
      get isTime() {
        return !!this._def.checks.find((ch) => ch.kind === "time");
      }
      get isDuration() {
        return !!this._def.checks.find((ch) => ch.kind === "duration");
      }
      get isEmail() {
        return !!this._def.checks.find((ch) => ch.kind === "email");
      }
      get isURL() {
        return !!this._def.checks.find((ch) => ch.kind === "url");
      }
      get isEmoji() {
        return !!this._def.checks.find((ch) => ch.kind === "emoji");
      }
      get isUUID() {
        return !!this._def.checks.find((ch) => ch.kind === "uuid");
      }
      get isNANOID() {
        return !!this._def.checks.find((ch) => ch.kind === "nanoid");
      }
      get isCUID() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid");
      }
      get isCUID2() {
        return !!this._def.checks.find((ch) => ch.kind === "cuid2");
      }
      get isULID() {
        return !!this._def.checks.find((ch) => ch.kind === "ulid");
      }
      get isIP() {
        return !!this._def.checks.find((ch) => ch.kind === "ip");
      }
      get isCIDR() {
        return !!this._def.checks.find((ch) => ch.kind === "cidr");
      }
      get isBase64() {
        return !!this._def.checks.find((ch) => ch.kind === "base64");
      }
      get isBase64url() {
        return !!this._def.checks.find((ch) => ch.kind === "base64url");
      }
      get minLength() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxLength() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
    };
    ZodString.create = (params) => {
      return new ZodString({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodString,
        coerce: params?.coerce ?? false,
        ...processCreateParams(params)
      });
    };
    ZodNumber = class _ZodNumber extends ZodType {
      constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
        this.step = this.multipleOf;
      }
      _parse(input) {
        if (this._def.coerce) {
          input.data = Number(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.number) {
          const ctx2 = this._getOrReturnCtx(input);
          addIssueToContext(ctx2, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.number,
            received: ctx2.parsedType
          });
          return INVALID;
        }
        let ctx = void 0;
        const status = new ParseStatus();
        for (const check of this._def.checks) {
          if (check.kind === "int") {
            if (!util.isInteger(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.invalid_type,
                expected: "integer",
                received: "float",
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "min") {
            const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
            if (tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check.value,
                type: "number",
                inclusive: check.inclusive,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
            if (tooBig) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check.value,
                type: "number",
                inclusive: check.inclusive,
                exact: false,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "multipleOf") {
            if (floatSafeRemainder(input.data, check.value) !== 0) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.not_multiple_of,
                multipleOf: check.value,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "finite") {
            if (!Number.isFinite(input.data)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.not_finite,
                message: check.message
              });
              status.dirty();
            }
          } else {
            util.assertNever(check);
          }
        }
        return { status: status.value, value: input.data };
      }
      gte(value, message) {
        return this.setLimit("min", value, true, errorUtil.toString(message));
      }
      gt(value, message) {
        return this.setLimit("min", value, false, errorUtil.toString(message));
      }
      lte(value, message) {
        return this.setLimit("max", value, true, errorUtil.toString(message));
      }
      lt(value, message) {
        return this.setLimit("max", value, false, errorUtil.toString(message));
      }
      setLimit(kind, value, inclusive, message) {
        return new _ZodNumber({
          ...this._def,
          checks: [
            ...this._def.checks,
            {
              kind,
              value,
              inclusive,
              message: errorUtil.toString(message)
            }
          ]
        });
      }
      _addCheck(check) {
        return new _ZodNumber({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      int(message) {
        return this._addCheck({
          kind: "int",
          message: errorUtil.toString(message)
        });
      }
      positive(message) {
        return this._addCheck({
          kind: "min",
          value: 0,
          inclusive: false,
          message: errorUtil.toString(message)
        });
      }
      negative(message) {
        return this._addCheck({
          kind: "max",
          value: 0,
          inclusive: false,
          message: errorUtil.toString(message)
        });
      }
      nonpositive(message) {
        return this._addCheck({
          kind: "max",
          value: 0,
          inclusive: true,
          message: errorUtil.toString(message)
        });
      }
      nonnegative(message) {
        return this._addCheck({
          kind: "min",
          value: 0,
          inclusive: true,
          message: errorUtil.toString(message)
        });
      }
      multipleOf(value, message) {
        return this._addCheck({
          kind: "multipleOf",
          value,
          message: errorUtil.toString(message)
        });
      }
      finite(message) {
        return this._addCheck({
          kind: "finite",
          message: errorUtil.toString(message)
        });
      }
      safe(message) {
        return this._addCheck({
          kind: "min",
          inclusive: true,
          value: Number.MIN_SAFE_INTEGER,
          message: errorUtil.toString(message)
        })._addCheck({
          kind: "max",
          inclusive: true,
          value: Number.MAX_SAFE_INTEGER,
          message: errorUtil.toString(message)
        });
      }
      get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
      get isInt() {
        return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
      }
      get isFinite() {
        let max = null;
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
            return true;
          } else if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          } else if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return Number.isFinite(min) && Number.isFinite(max);
      }
    };
    ZodNumber.create = (params) => {
      return new ZodNumber({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodNumber,
        coerce: params?.coerce || false,
        ...processCreateParams(params)
      });
    };
    ZodBigInt = class _ZodBigInt extends ZodType {
      constructor() {
        super(...arguments);
        this.min = this.gte;
        this.max = this.lte;
      }
      _parse(input) {
        if (this._def.coerce) {
          try {
            input.data = BigInt(input.data);
          } catch {
            return this._getInvalidInput(input);
          }
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.bigint) {
          return this._getInvalidInput(input);
        }
        let ctx = void 0;
        const status = new ParseStatus();
        for (const check of this._def.checks) {
          if (check.kind === "min") {
            const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
            if (tooSmall) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                type: "bigint",
                minimum: check.value,
                inclusive: check.inclusive,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
            if (tooBig) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                type: "bigint",
                maximum: check.value,
                inclusive: check.inclusive,
                message: check.message
              });
              status.dirty();
            }
          } else if (check.kind === "multipleOf") {
            if (input.data % check.value !== BigInt(0)) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.not_multiple_of,
                multipleOf: check.value,
                message: check.message
              });
              status.dirty();
            }
          } else {
            util.assertNever(check);
          }
        }
        return { status: status.value, value: input.data };
      }
      _getInvalidInput(input) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.bigint,
          received: ctx.parsedType
        });
        return INVALID;
      }
      gte(value, message) {
        return this.setLimit("min", value, true, errorUtil.toString(message));
      }
      gt(value, message) {
        return this.setLimit("min", value, false, errorUtil.toString(message));
      }
      lte(value, message) {
        return this.setLimit("max", value, true, errorUtil.toString(message));
      }
      lt(value, message) {
        return this.setLimit("max", value, false, errorUtil.toString(message));
      }
      setLimit(kind, value, inclusive, message) {
        return new _ZodBigInt({
          ...this._def,
          checks: [
            ...this._def.checks,
            {
              kind,
              value,
              inclusive,
              message: errorUtil.toString(message)
            }
          ]
        });
      }
      _addCheck(check) {
        return new _ZodBigInt({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      positive(message) {
        return this._addCheck({
          kind: "min",
          value: BigInt(0),
          inclusive: false,
          message: errorUtil.toString(message)
        });
      }
      negative(message) {
        return this._addCheck({
          kind: "max",
          value: BigInt(0),
          inclusive: false,
          message: errorUtil.toString(message)
        });
      }
      nonpositive(message) {
        return this._addCheck({
          kind: "max",
          value: BigInt(0),
          inclusive: true,
          message: errorUtil.toString(message)
        });
      }
      nonnegative(message) {
        return this._addCheck({
          kind: "min",
          value: BigInt(0),
          inclusive: true,
          message: errorUtil.toString(message)
        });
      }
      multipleOf(value, message) {
        return this._addCheck({
          kind: "multipleOf",
          value,
          message: errorUtil.toString(message)
        });
      }
      get minValue() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min;
      }
      get maxValue() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max;
      }
    };
    ZodBigInt.create = (params) => {
      return new ZodBigInt({
        checks: [],
        typeName: ZodFirstPartyTypeKind.ZodBigInt,
        coerce: params?.coerce ?? false,
        ...processCreateParams(params)
      });
    };
    ZodBoolean = class extends ZodType {
      _parse(input) {
        if (this._def.coerce) {
          input.data = Boolean(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.boolean) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.boolean,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return OK(input.data);
      }
    };
    ZodBoolean.create = (params) => {
      return new ZodBoolean({
        typeName: ZodFirstPartyTypeKind.ZodBoolean,
        coerce: params?.coerce || false,
        ...processCreateParams(params)
      });
    };
    ZodDate = class _ZodDate extends ZodType {
      _parse(input) {
        if (this._def.coerce) {
          input.data = new Date(input.data);
        }
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.date) {
          const ctx2 = this._getOrReturnCtx(input);
          addIssueToContext(ctx2, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.date,
            received: ctx2.parsedType
          });
          return INVALID;
        }
        if (Number.isNaN(input.data.getTime())) {
          const ctx2 = this._getOrReturnCtx(input);
          addIssueToContext(ctx2, {
            code: ZodIssueCode.invalid_date
          });
          return INVALID;
        }
        const status = new ParseStatus();
        let ctx = void 0;
        for (const check of this._def.checks) {
          if (check.kind === "min") {
            if (input.data.getTime() < check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                message: check.message,
                inclusive: true,
                exact: false,
                minimum: check.value,
                type: "date"
              });
              status.dirty();
            }
          } else if (check.kind === "max") {
            if (input.data.getTime() > check.value) {
              ctx = this._getOrReturnCtx(input, ctx);
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                message: check.message,
                inclusive: true,
                exact: false,
                maximum: check.value,
                type: "date"
              });
              status.dirty();
            }
          } else {
            util.assertNever(check);
          }
        }
        return {
          status: status.value,
          value: new Date(input.data.getTime())
        };
      }
      _addCheck(check) {
        return new _ZodDate({
          ...this._def,
          checks: [...this._def.checks, check]
        });
      }
      min(minDate, message) {
        return this._addCheck({
          kind: "min",
          value: minDate.getTime(),
          message: errorUtil.toString(message)
        });
      }
      max(maxDate, message) {
        return this._addCheck({
          kind: "max",
          value: maxDate.getTime(),
          message: errorUtil.toString(message)
        });
      }
      get minDate() {
        let min = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "min") {
            if (min === null || ch.value > min)
              min = ch.value;
          }
        }
        return min != null ? new Date(min) : null;
      }
      get maxDate() {
        let max = null;
        for (const ch of this._def.checks) {
          if (ch.kind === "max") {
            if (max === null || ch.value < max)
              max = ch.value;
          }
        }
        return max != null ? new Date(max) : null;
      }
    };
    ZodDate.create = (params) => {
      return new ZodDate({
        checks: [],
        coerce: params?.coerce || false,
        typeName: ZodFirstPartyTypeKind.ZodDate,
        ...processCreateParams(params)
      });
    };
    ZodSymbol = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.symbol) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.symbol,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return OK(input.data);
      }
    };
    ZodSymbol.create = (params) => {
      return new ZodSymbol({
        typeName: ZodFirstPartyTypeKind.ZodSymbol,
        ...processCreateParams(params)
      });
    };
    ZodUndefined = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.undefined) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.undefined,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return OK(input.data);
      }
    };
    ZodUndefined.create = (params) => {
      return new ZodUndefined({
        typeName: ZodFirstPartyTypeKind.ZodUndefined,
        ...processCreateParams(params)
      });
    };
    ZodNull = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.null) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.null,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return OK(input.data);
      }
    };
    ZodNull.create = (params) => {
      return new ZodNull({
        typeName: ZodFirstPartyTypeKind.ZodNull,
        ...processCreateParams(params)
      });
    };
    ZodAny = class extends ZodType {
      constructor() {
        super(...arguments);
        this._any = true;
      }
      _parse(input) {
        return OK(input.data);
      }
    };
    ZodAny.create = (params) => {
      return new ZodAny({
        typeName: ZodFirstPartyTypeKind.ZodAny,
        ...processCreateParams(params)
      });
    };
    ZodUnknown = class extends ZodType {
      constructor() {
        super(...arguments);
        this._unknown = true;
      }
      _parse(input) {
        return OK(input.data);
      }
    };
    ZodUnknown.create = (params) => {
      return new ZodUnknown({
        typeName: ZodFirstPartyTypeKind.ZodUnknown,
        ...processCreateParams(params)
      });
    };
    ZodNever = class extends ZodType {
      _parse(input) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.never,
          received: ctx.parsedType
        });
        return INVALID;
      }
    };
    ZodNever.create = (params) => {
      return new ZodNever({
        typeName: ZodFirstPartyTypeKind.ZodNever,
        ...processCreateParams(params)
      });
    };
    ZodVoid = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.undefined) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.void,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return OK(input.data);
      }
    };
    ZodVoid.create = (params) => {
      return new ZodVoid({
        typeName: ZodFirstPartyTypeKind.ZodVoid,
        ...processCreateParams(params)
      });
    };
    ZodArray = class _ZodArray extends ZodType {
      _parse(input) {
        const { ctx, status } = this._processInputParams(input);
        const def = this._def;
        if (ctx.parsedType !== ZodParsedType.array) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.array,
            received: ctx.parsedType
          });
          return INVALID;
        }
        if (def.exactLength !== null) {
          const tooBig = ctx.data.length > def.exactLength.value;
          const tooSmall = ctx.data.length < def.exactLength.value;
          if (tooBig || tooSmall) {
            addIssueToContext(ctx, {
              code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
              minimum: tooSmall ? def.exactLength.value : void 0,
              maximum: tooBig ? def.exactLength.value : void 0,
              type: "array",
              inclusive: true,
              exact: true,
              message: def.exactLength.message
            });
            status.dirty();
          }
        }
        if (def.minLength !== null) {
          if (ctx.data.length < def.minLength.value) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: def.minLength.value,
              type: "array",
              inclusive: true,
              exact: false,
              message: def.minLength.message
            });
            status.dirty();
          }
        }
        if (def.maxLength !== null) {
          if (ctx.data.length > def.maxLength.value) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: def.maxLength.value,
              type: "array",
              inclusive: true,
              exact: false,
              message: def.maxLength.message
            });
            status.dirty();
          }
        }
        if (ctx.common.async) {
          return Promise.all([...ctx.data].map((item, i2) => {
            return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i2));
          })).then((result2) => {
            return ParseStatus.mergeArray(status, result2);
          });
        }
        const result = [...ctx.data].map((item, i2) => {
          return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i2));
        });
        return ParseStatus.mergeArray(status, result);
      }
      get element() {
        return this._def.type;
      }
      min(minLength, message) {
        return new _ZodArray({
          ...this._def,
          minLength: { value: minLength, message: errorUtil.toString(message) }
        });
      }
      max(maxLength, message) {
        return new _ZodArray({
          ...this._def,
          maxLength: { value: maxLength, message: errorUtil.toString(message) }
        });
      }
      length(len, message) {
        return new _ZodArray({
          ...this._def,
          exactLength: { value: len, message: errorUtil.toString(message) }
        });
      }
      nonempty(message) {
        return this.min(1, message);
      }
    };
    ZodArray.create = (schema, params) => {
      return new ZodArray({
        type: schema,
        minLength: null,
        maxLength: null,
        exactLength: null,
        typeName: ZodFirstPartyTypeKind.ZodArray,
        ...processCreateParams(params)
      });
    };
    ZodObject = class _ZodObject extends ZodType {
      constructor() {
        super(...arguments);
        this._cached = null;
        this.nonstrict = this.passthrough;
        this.augment = this.extend;
      }
      _getCached() {
        if (this._cached !== null)
          return this._cached;
        const shape = this._def.shape();
        const keys = util.objectKeys(shape);
        this._cached = { shape, keys };
        return this._cached;
      }
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.object) {
          const ctx2 = this._getOrReturnCtx(input);
          addIssueToContext(ctx2, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.object,
            received: ctx2.parsedType
          });
          return INVALID;
        }
        const { status, ctx } = this._processInputParams(input);
        const { shape, keys: shapeKeys } = this._getCached();
        const extraKeys = [];
        if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
          for (const key in ctx.data) {
            if (!shapeKeys.includes(key)) {
              extraKeys.push(key);
            }
          }
        }
        const pairs = [];
        for (const key of shapeKeys) {
          const keyValidator = shape[key];
          const value = ctx.data[key];
          pairs.push({
            key: { status: "valid", value: key },
            value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
            alwaysSet: key in ctx.data
          });
        }
        if (this._def.catchall instanceof ZodNever) {
          const unknownKeys = this._def.unknownKeys;
          if (unknownKeys === "passthrough") {
            for (const key of extraKeys) {
              pairs.push({
                key: { status: "valid", value: key },
                value: { status: "valid", value: ctx.data[key] }
              });
            }
          } else if (unknownKeys === "strict") {
            if (extraKeys.length > 0) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.unrecognized_keys,
                keys: extraKeys
              });
              status.dirty();
            }
          } else if (unknownKeys === "strip") {
          } else {
            throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
          }
        } else {
          const catchall = this._def.catchall;
          for (const key of extraKeys) {
            const value = ctx.data[key];
            pairs.push({
              key: { status: "valid", value: key },
              value: catchall._parse(
                new ParseInputLazyPath(ctx, value, ctx.path, key)
                //, ctx.child(key), value, getParsedType(value)
              ),
              alwaysSet: key in ctx.data
            });
          }
        }
        if (ctx.common.async) {
          return Promise.resolve().then(async () => {
            const syncPairs = [];
            for (const pair of pairs) {
              const key = await pair.key;
              const value = await pair.value;
              syncPairs.push({
                key,
                value,
                alwaysSet: pair.alwaysSet
              });
            }
            return syncPairs;
          }).then((syncPairs) => {
            return ParseStatus.mergeObjectSync(status, syncPairs);
          });
        } else {
          return ParseStatus.mergeObjectSync(status, pairs);
        }
      }
      get shape() {
        return this._def.shape();
      }
      strict(message) {
        errorUtil.errToObj;
        return new _ZodObject({
          ...this._def,
          unknownKeys: "strict",
          ...message !== void 0 ? {
            errorMap: (issue, ctx) => {
              const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
              if (issue.code === "unrecognized_keys")
                return {
                  message: errorUtil.errToObj(message).message ?? defaultError
                };
              return {
                message: defaultError
              };
            }
          } : {}
        });
      }
      strip() {
        return new _ZodObject({
          ...this._def,
          unknownKeys: "strip"
        });
      }
      passthrough() {
        return new _ZodObject({
          ...this._def,
          unknownKeys: "passthrough"
        });
      }
      // const AugmentFactory =
      //   <Def extends ZodObjectDef>(def: Def) =>
      //   <Augmentation extends ZodRawShape>(
      //     augmentation: Augmentation
      //   ): ZodObject<
      //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
      //     Def["unknownKeys"],
      //     Def["catchall"]
      //   > => {
      //     return new ZodObject({
      //       ...def,
      //       shape: () => ({
      //         ...def.shape(),
      //         ...augmentation,
      //       }),
      //     }) as any;
      //   };
      extend(augmentation) {
        return new _ZodObject({
          ...this._def,
          shape: () => ({
            ...this._def.shape(),
            ...augmentation
          })
        });
      }
      /**
       * Prior to zod@1.0.12 there was a bug in the
       * inferred type of merged objects. Please
       * upgrade if you are experiencing issues.
       */
      merge(merging) {
        const merged = new _ZodObject({
          unknownKeys: merging._def.unknownKeys,
          catchall: merging._def.catchall,
          shape: () => ({
            ...this._def.shape(),
            ...merging._def.shape()
          }),
          typeName: ZodFirstPartyTypeKind.ZodObject
        });
        return merged;
      }
      // merge<
      //   Incoming extends AnyZodObject,
      //   Augmentation extends Incoming["shape"],
      //   NewOutput extends {
      //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
      //       ? Augmentation[k]["_output"]
      //       : k extends keyof Output
      //       ? Output[k]
      //       : never;
      //   },
      //   NewInput extends {
      //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
      //       ? Augmentation[k]["_input"]
      //       : k extends keyof Input
      //       ? Input[k]
      //       : never;
      //   }
      // >(
      //   merging: Incoming
      // ): ZodObject<
      //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
      //   Incoming["_def"]["unknownKeys"],
      //   Incoming["_def"]["catchall"],
      //   NewOutput,
      //   NewInput
      // > {
      //   const merged: any = new ZodObject({
      //     unknownKeys: merging._def.unknownKeys,
      //     catchall: merging._def.catchall,
      //     shape: () =>
      //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
      //     typeName: ZodFirstPartyTypeKind.ZodObject,
      //   }) as any;
      //   return merged;
      // }
      setKey(key, schema) {
        return this.augment({ [key]: schema });
      }
      // merge<Incoming extends AnyZodObject>(
      //   merging: Incoming
      // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
      // ZodObject<
      //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
      //   Incoming["_def"]["unknownKeys"],
      //   Incoming["_def"]["catchall"]
      // > {
      //   // const mergedShape = objectUtil.mergeShapes(
      //   //   this._def.shape(),
      //   //   merging._def.shape()
      //   // );
      //   const merged: any = new ZodObject({
      //     unknownKeys: merging._def.unknownKeys,
      //     catchall: merging._def.catchall,
      //     shape: () =>
      //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
      //     typeName: ZodFirstPartyTypeKind.ZodObject,
      //   }) as any;
      //   return merged;
      // }
      catchall(index) {
        return new _ZodObject({
          ...this._def,
          catchall: index
        });
      }
      pick(mask) {
        const shape = {};
        for (const key of util.objectKeys(mask)) {
          if (mask[key] && this.shape[key]) {
            shape[key] = this.shape[key];
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => shape
        });
      }
      omit(mask) {
        const shape = {};
        for (const key of util.objectKeys(this.shape)) {
          if (!mask[key]) {
            shape[key] = this.shape[key];
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => shape
        });
      }
      /**
       * @deprecated
       */
      deepPartial() {
        return deepPartialify(this);
      }
      partial(mask) {
        const newShape = {};
        for (const key of util.objectKeys(this.shape)) {
          const fieldSchema = this.shape[key];
          if (mask && !mask[key]) {
            newShape[key] = fieldSchema;
          } else {
            newShape[key] = fieldSchema.optional();
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => newShape
        });
      }
      required(mask) {
        const newShape = {};
        for (const key of util.objectKeys(this.shape)) {
          if (mask && !mask[key]) {
            newShape[key] = this.shape[key];
          } else {
            const fieldSchema = this.shape[key];
            let newField = fieldSchema;
            while (newField instanceof ZodOptional) {
              newField = newField._def.innerType;
            }
            newShape[key] = newField;
          }
        }
        return new _ZodObject({
          ...this._def,
          shape: () => newShape
        });
      }
      keyof() {
        return createZodEnum(util.objectKeys(this.shape));
      }
    };
    ZodObject.create = (shape, params) => {
      return new ZodObject({
        shape: () => shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params)
      });
    };
    ZodObject.strictCreate = (shape, params) => {
      return new ZodObject({
        shape: () => shape,
        unknownKeys: "strict",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params)
      });
    };
    ZodObject.lazycreate = (shape, params) => {
      return new ZodObject({
        shape,
        unknownKeys: "strip",
        catchall: ZodNever.create(),
        typeName: ZodFirstPartyTypeKind.ZodObject,
        ...processCreateParams(params)
      });
    };
    ZodUnion = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const options = this._def.options;
        function handleResults(results) {
          for (const result of results) {
            if (result.result.status === "valid") {
              return result.result;
            }
          }
          for (const result of results) {
            if (result.result.status === "dirty") {
              ctx.common.issues.push(...result.ctx.common.issues);
              return result.result;
            }
          }
          const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_union,
            unionErrors
          });
          return INVALID;
        }
        if (ctx.common.async) {
          return Promise.all(options.map(async (option) => {
            const childCtx = {
              ...ctx,
              common: {
                ...ctx.common,
                issues: []
              },
              parent: null
            };
            return {
              result: await option._parseAsync({
                data: ctx.data,
                path: ctx.path,
                parent: childCtx
              }),
              ctx: childCtx
            };
          })).then(handleResults);
        } else {
          let dirty = void 0;
          const issues = [];
          for (const option of options) {
            const childCtx = {
              ...ctx,
              common: {
                ...ctx.common,
                issues: []
              },
              parent: null
            };
            const result = option._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx
            });
            if (result.status === "valid") {
              return result;
            } else if (result.status === "dirty" && !dirty) {
              dirty = { result, ctx: childCtx };
            }
            if (childCtx.common.issues.length) {
              issues.push(childCtx.common.issues);
            }
          }
          if (dirty) {
            ctx.common.issues.push(...dirty.ctx.common.issues);
            return dirty.result;
          }
          const unionErrors = issues.map((issues2) => new ZodError(issues2));
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_union,
            unionErrors
          });
          return INVALID;
        }
      }
      get options() {
        return this._def.options;
      }
    };
    ZodUnion.create = (types, params) => {
      return new ZodUnion({
        options: types,
        typeName: ZodFirstPartyTypeKind.ZodUnion,
        ...processCreateParams(params)
      });
    };
    getDiscriminator = (type) => {
      if (type instanceof ZodLazy) {
        return getDiscriminator(type.schema);
      } else if (type instanceof ZodEffects) {
        return getDiscriminator(type.innerType());
      } else if (type instanceof ZodLiteral) {
        return [type.value];
      } else if (type instanceof ZodEnum) {
        return type.options;
      } else if (type instanceof ZodNativeEnum) {
        return util.objectValues(type.enum);
      } else if (type instanceof ZodDefault) {
        return getDiscriminator(type._def.innerType);
      } else if (type instanceof ZodUndefined) {
        return [void 0];
      } else if (type instanceof ZodNull) {
        return [null];
      } else if (type instanceof ZodOptional) {
        return [void 0, ...getDiscriminator(type.unwrap())];
      } else if (type instanceof ZodNullable) {
        return [null, ...getDiscriminator(type.unwrap())];
      } else if (type instanceof ZodBranded) {
        return getDiscriminator(type.unwrap());
      } else if (type instanceof ZodReadonly) {
        return getDiscriminator(type.unwrap());
      } else if (type instanceof ZodCatch) {
        return getDiscriminator(type._def.innerType);
      } else {
        return [];
      }
    };
    ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.object) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.object,
            received: ctx.parsedType
          });
          return INVALID;
        }
        const discriminator = this.discriminator;
        const discriminatorValue = ctx.data[discriminator];
        const option = this.optionsMap.get(discriminatorValue);
        if (!option) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_union_discriminator,
            options: Array.from(this.optionsMap.keys()),
            path: [discriminator]
          });
          return INVALID;
        }
        if (ctx.common.async) {
          return option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
        } else {
          return option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
        }
      }
      get discriminator() {
        return this._def.discriminator;
      }
      get options() {
        return this._def.options;
      }
      get optionsMap() {
        return this._def.optionsMap;
      }
      /**
       * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
       * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
       * have a different value for each object in the union.
       * @param discriminator the name of the discriminator property
       * @param types an array of object schemas
       * @param params
       */
      static create(discriminator, options, params) {
        const optionsMap = /* @__PURE__ */ new Map();
        for (const type of options) {
          const discriminatorValues = getDiscriminator(type.shape[discriminator]);
          if (!discriminatorValues.length) {
            throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
          }
          for (const value of discriminatorValues) {
            if (optionsMap.has(value)) {
              throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
            }
            optionsMap.set(value, type);
          }
        }
        return new _ZodDiscriminatedUnion({
          typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
          discriminator,
          options,
          optionsMap,
          ...processCreateParams(params)
        });
      }
    };
    ZodIntersection = class extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const handleParsed = (parsedLeft, parsedRight) => {
          if (isAborted(parsedLeft) || isAborted(parsedRight)) {
            return INVALID;
          }
          const merged = mergeValues(parsedLeft.value, parsedRight.value);
          if (!merged.valid) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_intersection_types
            });
            return INVALID;
          }
          if (isDirty(parsedLeft) || isDirty(parsedRight)) {
            status.dirty();
          }
          return { status: status.value, value: merged.data };
        };
        if (ctx.common.async) {
          return Promise.all([
            this._def.left._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            }),
            this._def.right._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            })
          ]).then(([left, right]) => handleParsed(left, right));
        } else {
          return handleParsed(this._def.left._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }), this._def.right._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }));
        }
      }
    };
    ZodIntersection.create = (left, right, params) => {
      return new ZodIntersection({
        left,
        right,
        typeName: ZodFirstPartyTypeKind.ZodIntersection,
        ...processCreateParams(params)
      });
    };
    ZodTuple = class _ZodTuple extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.array) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.array,
            received: ctx.parsedType
          });
          return INVALID;
        }
        if (ctx.data.length < this._def.items.length) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: this._def.items.length,
            inclusive: true,
            exact: false,
            type: "array"
          });
          return INVALID;
        }
        const rest = this._def.rest;
        if (!rest && ctx.data.length > this._def.items.length) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: this._def.items.length,
            inclusive: true,
            exact: false,
            type: "array"
          });
          status.dirty();
        }
        const items = [...ctx.data].map((item, itemIndex) => {
          const schema = this._def.items[itemIndex] || this._def.rest;
          if (!schema)
            return null;
          return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
        }).filter((x2) => !!x2);
        if (ctx.common.async) {
          return Promise.all(items).then((results) => {
            return ParseStatus.mergeArray(status, results);
          });
        } else {
          return ParseStatus.mergeArray(status, items);
        }
      }
      get items() {
        return this._def.items;
      }
      rest(rest) {
        return new _ZodTuple({
          ...this._def,
          rest
        });
      }
    };
    ZodTuple.create = (schemas, params) => {
      if (!Array.isArray(schemas)) {
        throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
      }
      return new ZodTuple({
        items: schemas,
        typeName: ZodFirstPartyTypeKind.ZodTuple,
        rest: null,
        ...processCreateParams(params)
      });
    };
    ZodRecord = class _ZodRecord extends ZodType {
      get keySchema() {
        return this._def.keyType;
      }
      get valueSchema() {
        return this._def.valueType;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.object) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.object,
            received: ctx.parsedType
          });
          return INVALID;
        }
        const pairs = [];
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        for (const key in ctx.data) {
          pairs.push({
            key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
            value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
            alwaysSet: key in ctx.data
          });
        }
        if (ctx.common.async) {
          return ParseStatus.mergeObjectAsync(status, pairs);
        } else {
          return ParseStatus.mergeObjectSync(status, pairs);
        }
      }
      get element() {
        return this._def.valueType;
      }
      static create(first2, second, third) {
        if (second instanceof ZodType) {
          return new _ZodRecord({
            keyType: first2,
            valueType: second,
            typeName: ZodFirstPartyTypeKind.ZodRecord,
            ...processCreateParams(third)
          });
        }
        return new _ZodRecord({
          keyType: ZodString.create(),
          valueType: first2,
          typeName: ZodFirstPartyTypeKind.ZodRecord,
          ...processCreateParams(second)
        });
      }
    };
    ZodMap = class extends ZodType {
      get keySchema() {
        return this._def.keyType;
      }
      get valueSchema() {
        return this._def.valueType;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.map) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.map,
            received: ctx.parsedType
          });
          return INVALID;
        }
        const keyType = this._def.keyType;
        const valueType = this._def.valueType;
        const pairs = [...ctx.data.entries()].map(([key, value], index) => {
          return {
            key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
            value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
          };
        });
        if (ctx.common.async) {
          const finalMap = /* @__PURE__ */ new Map();
          return Promise.resolve().then(async () => {
            for (const pair of pairs) {
              const key = await pair.key;
              const value = await pair.value;
              if (key.status === "aborted" || value.status === "aborted") {
                return INVALID;
              }
              if (key.status === "dirty" || value.status === "dirty") {
                status.dirty();
              }
              finalMap.set(key.value, value.value);
            }
            return { status: status.value, value: finalMap };
          });
        } else {
          const finalMap = /* @__PURE__ */ new Map();
          for (const pair of pairs) {
            const key = pair.key;
            const value = pair.value;
            if (key.status === "aborted" || value.status === "aborted") {
              return INVALID;
            }
            if (key.status === "dirty" || value.status === "dirty") {
              status.dirty();
            }
            finalMap.set(key.value, value.value);
          }
          return { status: status.value, value: finalMap };
        }
      }
    };
    ZodMap.create = (keyType, valueType, params) => {
      return new ZodMap({
        valueType,
        keyType,
        typeName: ZodFirstPartyTypeKind.ZodMap,
        ...processCreateParams(params)
      });
    };
    ZodSet = class _ZodSet extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.set) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.set,
            received: ctx.parsedType
          });
          return INVALID;
        }
        const def = this._def;
        if (def.minSize !== null) {
          if (ctx.data.size < def.minSize.value) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: def.minSize.value,
              type: "set",
              inclusive: true,
              exact: false,
              message: def.minSize.message
            });
            status.dirty();
          }
        }
        if (def.maxSize !== null) {
          if (ctx.data.size > def.maxSize.value) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: def.maxSize.value,
              type: "set",
              inclusive: true,
              exact: false,
              message: def.maxSize.message
            });
            status.dirty();
          }
        }
        const valueType = this._def.valueType;
        function finalizeSet(elements2) {
          const parsedSet = /* @__PURE__ */ new Set();
          for (const element of elements2) {
            if (element.status === "aborted")
              return INVALID;
            if (element.status === "dirty")
              status.dirty();
            parsedSet.add(element.value);
          }
          return { status: status.value, value: parsedSet };
        }
        const elements = [...ctx.data.values()].map((item, i2) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i2)));
        if (ctx.common.async) {
          return Promise.all(elements).then((elements2) => finalizeSet(elements2));
        } else {
          return finalizeSet(elements);
        }
      }
      min(minSize, message) {
        return new _ZodSet({
          ...this._def,
          minSize: { value: minSize, message: errorUtil.toString(message) }
        });
      }
      max(maxSize, message) {
        return new _ZodSet({
          ...this._def,
          maxSize: { value: maxSize, message: errorUtil.toString(message) }
        });
      }
      size(size, message) {
        return this.min(size, message).max(size, message);
      }
      nonempty(message) {
        return this.min(1, message);
      }
    };
    ZodSet.create = (valueType, params) => {
      return new ZodSet({
        valueType,
        minSize: null,
        maxSize: null,
        typeName: ZodFirstPartyTypeKind.ZodSet,
        ...processCreateParams(params)
      });
    };
    ZodFunction = class _ZodFunction extends ZodType {
      constructor() {
        super(...arguments);
        this.validate = this.implement;
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.function) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.function,
            received: ctx.parsedType
          });
          return INVALID;
        }
        function makeArgsIssue(args, error) {
          return makeIssue({
            data: args,
            path: ctx.path,
            errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x2) => !!x2),
            issueData: {
              code: ZodIssueCode.invalid_arguments,
              argumentsError: error
            }
          });
        }
        function makeReturnsIssue(returns, error) {
          return makeIssue({
            data: returns,
            path: ctx.path,
            errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x2) => !!x2),
            issueData: {
              code: ZodIssueCode.invalid_return_type,
              returnTypeError: error
            }
          });
        }
        const params = { errorMap: ctx.common.contextualErrorMap };
        const fn = ctx.data;
        if (this._def.returns instanceof ZodPromise) {
          const me = this;
          return OK(async function(...args) {
            const error = new ZodError([]);
            const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
              error.addIssue(makeArgsIssue(args, e));
              throw error;
            });
            const result = await Reflect.apply(fn, this, parsedArgs);
            const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
              error.addIssue(makeReturnsIssue(result, e));
              throw error;
            });
            return parsedReturns;
          });
        } else {
          const me = this;
          return OK(function(...args) {
            const parsedArgs = me._def.args.safeParse(args, params);
            if (!parsedArgs.success) {
              throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
            }
            const result = Reflect.apply(fn, this, parsedArgs.data);
            const parsedReturns = me._def.returns.safeParse(result, params);
            if (!parsedReturns.success) {
              throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
            }
            return parsedReturns.data;
          });
        }
      }
      parameters() {
        return this._def.args;
      }
      returnType() {
        return this._def.returns;
      }
      args(...items) {
        return new _ZodFunction({
          ...this._def,
          args: ZodTuple.create(items).rest(ZodUnknown.create())
        });
      }
      returns(returnType) {
        return new _ZodFunction({
          ...this._def,
          returns: returnType
        });
      }
      implement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
      }
      strictImplement(func) {
        const validatedFunc = this.parse(func);
        return validatedFunc;
      }
      static create(args, returns, params) {
        return new _ZodFunction({
          args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
          returns: returns || ZodUnknown.create(),
          typeName: ZodFirstPartyTypeKind.ZodFunction,
          ...processCreateParams(params)
        });
      }
    };
    ZodLazy = class extends ZodType {
      get schema() {
        return this._def.getter();
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const lazySchema = this._def.getter();
        return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
      }
    };
    ZodLazy.create = (getter, params) => {
      return new ZodLazy({
        getter,
        typeName: ZodFirstPartyTypeKind.ZodLazy,
        ...processCreateParams(params)
      });
    };
    ZodLiteral = class extends ZodType {
      _parse(input) {
        if (input.data !== this._def.value) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            received: ctx.data,
            code: ZodIssueCode.invalid_literal,
            expected: this._def.value
          });
          return INVALID;
        }
        return { status: "valid", value: input.data };
      }
      get value() {
        return this._def.value;
      }
    };
    ZodLiteral.create = (value, params) => {
      return new ZodLiteral({
        value,
        typeName: ZodFirstPartyTypeKind.ZodLiteral,
        ...processCreateParams(params)
      });
    };
    ZodEnum = class _ZodEnum extends ZodType {
      _parse(input) {
        if (typeof input.data !== "string") {
          const ctx = this._getOrReturnCtx(input);
          const expectedValues = this._def.values;
          addIssueToContext(ctx, {
            expected: util.joinValues(expectedValues),
            received: ctx.parsedType,
            code: ZodIssueCode.invalid_type
          });
          return INVALID;
        }
        if (!this._cache) {
          this._cache = new Set(this._def.values);
        }
        if (!this._cache.has(input.data)) {
          const ctx = this._getOrReturnCtx(input);
          const expectedValues = this._def.values;
          addIssueToContext(ctx, {
            received: ctx.data,
            code: ZodIssueCode.invalid_enum_value,
            options: expectedValues
          });
          return INVALID;
        }
        return OK(input.data);
      }
      get options() {
        return this._def.values;
      }
      get enum() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      get Values() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      get Enum() {
        const enumValues = {};
        for (const val of this._def.values) {
          enumValues[val] = val;
        }
        return enumValues;
      }
      extract(values, newDef = this._def) {
        return _ZodEnum.create(values, {
          ...this._def,
          ...newDef
        });
      }
      exclude(values, newDef = this._def) {
        return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
          ...this._def,
          ...newDef
        });
      }
    };
    ZodEnum.create = createZodEnum;
    ZodNativeEnum = class extends ZodType {
      _parse(input) {
        const nativeEnumValues = util.getValidEnumValues(this._def.values);
        const ctx = this._getOrReturnCtx(input);
        if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
          const expectedValues = util.objectValues(nativeEnumValues);
          addIssueToContext(ctx, {
            expected: util.joinValues(expectedValues),
            received: ctx.parsedType,
            code: ZodIssueCode.invalid_type
          });
          return INVALID;
        }
        if (!this._cache) {
          this._cache = new Set(util.getValidEnumValues(this._def.values));
        }
        if (!this._cache.has(input.data)) {
          const expectedValues = util.objectValues(nativeEnumValues);
          addIssueToContext(ctx, {
            received: ctx.data,
            code: ZodIssueCode.invalid_enum_value,
            options: expectedValues
          });
          return INVALID;
        }
        return OK(input.data);
      }
      get enum() {
        return this._def.values;
      }
    };
    ZodNativeEnum.create = (values, params) => {
      return new ZodNativeEnum({
        values,
        typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
        ...processCreateParams(params)
      });
    };
    ZodPromise = class extends ZodType {
      unwrap() {
        return this._def.type;
      }
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.promise,
            received: ctx.parsedType
          });
          return INVALID;
        }
        const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
        return OK(promisified.then((data) => {
          return this._def.type.parseAsync(data, {
            path: ctx.path,
            errorMap: ctx.common.contextualErrorMap
          });
        }));
      }
    };
    ZodPromise.create = (schema, params) => {
      return new ZodPromise({
        type: schema,
        typeName: ZodFirstPartyTypeKind.ZodPromise,
        ...processCreateParams(params)
      });
    };
    ZodEffects = class extends ZodType {
      innerType() {
        return this._def.schema;
      }
      sourceType() {
        return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
      }
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        const effect = this._def.effect || null;
        const checkCtx = {
          addIssue: (arg) => {
            addIssueToContext(ctx, arg);
            if (arg.fatal) {
              status.abort();
            } else {
              status.dirty();
            }
          },
          get path() {
            return ctx.path;
          }
        };
        checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
        if (effect.type === "preprocess") {
          const processed = effect.transform(ctx.data, checkCtx);
          if (ctx.common.async) {
            return Promise.resolve(processed).then(async (processed2) => {
              if (status.value === "aborted")
                return INVALID;
              const result = await this._def.schema._parseAsync({
                data: processed2,
                path: ctx.path,
                parent: ctx
              });
              if (result.status === "aborted")
                return INVALID;
              if (result.status === "dirty")
                return DIRTY(result.value);
              if (status.value === "dirty")
                return DIRTY(result.value);
              return result;
            });
          } else {
            if (status.value === "aborted")
              return INVALID;
            const result = this._def.schema._parseSync({
              data: processed,
              path: ctx.path,
              parent: ctx
            });
            if (result.status === "aborted")
              return INVALID;
            if (result.status === "dirty")
              return DIRTY(result.value);
            if (status.value === "dirty")
              return DIRTY(result.value);
            return result;
          }
        }
        if (effect.type === "refinement") {
          const executeRefinement = (acc) => {
            const result = effect.refinement(acc, checkCtx);
            if (ctx.common.async) {
              return Promise.resolve(result);
            }
            if (result instanceof Promise) {
              throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
            }
            return acc;
          };
          if (ctx.common.async === false) {
            const inner = this._def.schema._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (inner.status === "aborted")
              return INVALID;
            if (inner.status === "dirty")
              status.dirty();
            executeRefinement(inner.value);
            return { status: status.value, value: inner.value };
          } else {
            return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
              if (inner.status === "aborted")
                return INVALID;
              if (inner.status === "dirty")
                status.dirty();
              return executeRefinement(inner.value).then(() => {
                return { status: status.value, value: inner.value };
              });
            });
          }
        }
        if (effect.type === "transform") {
          if (ctx.common.async === false) {
            const base = this._def.schema._parseSync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (!isValid(base))
              return INVALID;
            const result = effect.transform(base.value, checkCtx);
            if (result instanceof Promise) {
              throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
            }
            return { status: status.value, value: result };
          } else {
            return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
              if (!isValid(base))
                return INVALID;
              return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
                status: status.value,
                value: result
              }));
            });
          }
        }
        util.assertNever(effect);
      }
    };
    ZodEffects.create = (schema, effect, params) => {
      return new ZodEffects({
        schema,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect,
        ...processCreateParams(params)
      });
    };
    ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
      return new ZodEffects({
        schema,
        effect: { type: "preprocess", transform: preprocess },
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        ...processCreateParams(params)
      });
    };
    ZodOptional = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === ZodParsedType.undefined) {
          return OK(void 0);
        }
        return this._def.innerType._parse(input);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    ZodOptional.create = (type, params) => {
      return new ZodOptional({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodOptional,
        ...processCreateParams(params)
      });
    };
    ZodNullable = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType === ZodParsedType.null) {
          return OK(null);
        }
        return this._def.innerType._parse(input);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    ZodNullable.create = (type, params) => {
      return new ZodNullable({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodNullable,
        ...processCreateParams(params)
      });
    };
    ZodDefault = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        let data = ctx.data;
        if (ctx.parsedType === ZodParsedType.undefined) {
          data = this._def.defaultValue();
        }
        return this._def.innerType._parse({
          data,
          path: ctx.path,
          parent: ctx
        });
      }
      removeDefault() {
        return this._def.innerType;
      }
    };
    ZodDefault.create = (type, params) => {
      return new ZodDefault({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodDefault,
        defaultValue: typeof params.default === "function" ? params.default : () => params.default,
        ...processCreateParams(params)
      });
    };
    ZodCatch = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const newCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          }
        };
        const result = this._def.innerType._parse({
          data: newCtx.data,
          path: newCtx.path,
          parent: {
            ...newCtx
          }
        });
        if (isAsync(result)) {
          return result.then((result2) => {
            return {
              status: "valid",
              value: result2.status === "valid" ? result2.value : this._def.catchValue({
                get error() {
                  return new ZodError(newCtx.common.issues);
                },
                input: newCtx.data
              })
            };
          });
        } else {
          return {
            status: "valid",
            value: result.status === "valid" ? result.value : this._def.catchValue({
              get error() {
                return new ZodError(newCtx.common.issues);
              },
              input: newCtx.data
            })
          };
        }
      }
      removeCatch() {
        return this._def.innerType;
      }
    };
    ZodCatch.create = (type, params) => {
      return new ZodCatch({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodCatch,
        catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
        ...processCreateParams(params)
      });
    };
    ZodNaN = class extends ZodType {
      _parse(input) {
        const parsedType = this._getType(input);
        if (parsedType !== ZodParsedType.nan) {
          const ctx = this._getOrReturnCtx(input);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: ZodParsedType.nan,
            received: ctx.parsedType
          });
          return INVALID;
        }
        return { status: "valid", value: input.data };
      }
    };
    ZodNaN.create = (params) => {
      return new ZodNaN({
        typeName: ZodFirstPartyTypeKind.ZodNaN,
        ...processCreateParams(params)
      });
    };
    BRAND = Symbol("zod_brand");
    ZodBranded = class extends ZodType {
      _parse(input) {
        const { ctx } = this._processInputParams(input);
        const data = ctx.data;
        return this._def.type._parse({
          data,
          path: ctx.path,
          parent: ctx
        });
      }
      unwrap() {
        return this._def.type;
      }
    };
    ZodPipeline = class _ZodPipeline extends ZodType {
      _parse(input) {
        const { status, ctx } = this._processInputParams(input);
        if (ctx.common.async) {
          const handleAsync = async () => {
            const inResult = await this._def.in._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: ctx
            });
            if (inResult.status === "aborted")
              return INVALID;
            if (inResult.status === "dirty") {
              status.dirty();
              return DIRTY(inResult.value);
            } else {
              return this._def.out._parseAsync({
                data: inResult.value,
                path: ctx.path,
                parent: ctx
              });
            }
          };
          return handleAsync();
        } else {
          const inResult = this._def.in._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inResult.status === "aborted")
            return INVALID;
          if (inResult.status === "dirty") {
            status.dirty();
            return {
              status: "dirty",
              value: inResult.value
            };
          } else {
            return this._def.out._parseSync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx
            });
          }
        }
      }
      static create(a, b2) {
        return new _ZodPipeline({
          in: a,
          out: b2,
          typeName: ZodFirstPartyTypeKind.ZodPipeline
        });
      }
    };
    ZodReadonly = class extends ZodType {
      _parse(input) {
        const result = this._def.innerType._parse(input);
        const freeze = (data) => {
          if (isValid(data)) {
            data.value = Object.freeze(data.value);
          }
          return data;
        };
        return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
    ZodReadonly.create = (type, params) => {
      return new ZodReadonly({
        innerType: type,
        typeName: ZodFirstPartyTypeKind.ZodReadonly,
        ...processCreateParams(params)
      });
    };
    late = {
      object: ZodObject.lazycreate
    };
    (function(ZodFirstPartyTypeKind2) {
      ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
      ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
      ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
      ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
      ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
      ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
      ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
      ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
      ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
      ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
      ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
      ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
      ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
      ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
      ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
      ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
      ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
      ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
      ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
      ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
      ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
      ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
      ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
      ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
      ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
      ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
      ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
      ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
      ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
      ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
      ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
      ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
      ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
      ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
      ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
      ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
    })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
    instanceOfType = (cls, params = {
      message: `Input not instance of ${cls.name}`
    }) => custom((data) => data instanceof cls, params);
    stringType = ZodString.create;
    numberType = ZodNumber.create;
    nanType = ZodNaN.create;
    bigIntType = ZodBigInt.create;
    booleanType = ZodBoolean.create;
    dateType = ZodDate.create;
    symbolType = ZodSymbol.create;
    undefinedType = ZodUndefined.create;
    nullType = ZodNull.create;
    anyType = ZodAny.create;
    unknownType = ZodUnknown.create;
    neverType = ZodNever.create;
    voidType = ZodVoid.create;
    arrayType = ZodArray.create;
    objectType = ZodObject.create;
    strictObjectType = ZodObject.strictCreate;
    unionType = ZodUnion.create;
    discriminatedUnionType = ZodDiscriminatedUnion.create;
    intersectionType = ZodIntersection.create;
    tupleType = ZodTuple.create;
    recordType = ZodRecord.create;
    mapType = ZodMap.create;
    setType = ZodSet.create;
    functionType = ZodFunction.create;
    lazyType = ZodLazy.create;
    literalType = ZodLiteral.create;
    enumType = ZodEnum.create;
    nativeEnumType = ZodNativeEnum.create;
    promiseType = ZodPromise.create;
    effectsType = ZodEffects.create;
    optionalType = ZodOptional.create;
    nullableType = ZodNullable.create;
    preprocessType = ZodEffects.createWithPreprocess;
    pipelineType = ZodPipeline.create;
    ostring = () => stringType().optional();
    onumber = () => numberType().optional();
    oboolean = () => booleanType().optional();
    coerce = {
      string: (arg) => ZodString.create({ ...arg, coerce: true }),
      number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
      boolean: (arg) => ZodBoolean.create({
        ...arg,
        coerce: true
      }),
      bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
      date: (arg) => ZodDate.create({ ...arg, coerce: true })
    };
    NEVER = INVALID;
  }
});

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});
var init_external = __esm({
  "node_modules/zod/v3/external.js"() {
    init_errors();
    init_parseUtil();
    init_typeAliases();
    init_util();
    init_types();
    init_ZodError();
  }
});

// node_modules/zod/index.js
var init_zod = __esm({
  "node_modules/zod/index.js"() {
    init_external();
    init_external();
  }
});

// src/_shared/config.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";
function configDir() {
  return join(homedir(), ".memarium");
}
function configPath() {
  return join(configDir(), "config.json");
}
function migrateLegacyConfigDir() {
  const legacy = join(homedir(), ".vibebook");
  const dir = configDir();
  if (existsSync(dir) || !existsSync(legacy)) return;
  try {
    renameSync(legacy, dir);
    const p2 = configPath();
    let repoPath = join(dir, "session-repo");
    if (existsSync(p2)) {
      const raw = readFileSync(p2, "utf8");
      const fixed = raw.split(legacy).join(dir).split("~/.vibebook").join("~/.memarium");
      if (fixed !== raw) writeFileSync(p2, fixed);
      try {
        const parsed = JSON.parse(fixed);
        if (parsed.repoPath) repoPath = parsed.repoPath.replace(/^~(?=$|\/)/, homedir());
      } catch {
      }
    }
    const agg = join(dir, "aggregated");
    if (existsSync(agg)) {
      spawnSync("git", ["-C", repoPath, "worktree", "repair", agg], { stdio: "ignore", timeout: 1e4 });
    }
  } catch {
  }
}
var DEFAULT_THREADING_CONCURRENCY, DEFAULT_THREADING_MAX_ATTEMPTS, Schema;
var init_config = __esm({
  "src/_shared/config.ts"() {
    "use strict";
    init_zod();
    DEFAULT_THREADING_CONCURRENCY = 4;
    DEFAULT_THREADING_MAX_ATTEMPTS = 3;
    Schema = external_exports.object({
      repoPath: external_exports.string(),
      repoUrl: external_exports.string(),
      deviceBranch: external_exports.string().default(""),
      runner: external_exports.enum(["claude-cli", "anthropic-api"]).default("claude-cli"),
      /** When true, the user opted into the CI book-aggregation workflow
       *  (scripts/merge-books.mjs runs on push to any non-main branch and
       *  merges device books into main). Purely informational — the workflow
       *  yaml + script live in the user's repo, not driven by this flag. */
      enableAggregateCI: external_exports.boolean().default(false),
      /** When true, include the assistant's reasoning/thinking content in synced
       *  raw_sessions/*.md files. Improves digest quality (the summarizing LLM
       *  can see WHY the assistant chose a path) but can grow each md file by
       *  30-100%. Recommended when summarizing with a 400K+ context model;
       *  recommended off when summarizing with a smaller model. Default: true. */
      includeReasoning: external_exports.boolean().default(true),
      threadingConcurrency: external_exports.number().int().positive().default(DEFAULT_THREADING_CONCURRENCY),
      threadingMaxAttempts: external_exports.number().int().positive().default(DEFAULT_THREADING_MAX_ATTEMPTS),
      digestEnabled: external_exports.boolean().default(true)
    });
  }
});

// src/spool/plugin-config.ts
import { existsSync as existsSync2, readFileSync as readFileSync2 } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { join as join2 } from "node:path";
function configPath2() {
  return join2(homedir2(), ".memarium", "config.json");
}
function defaultPluginConfig() {
  return {
    repoPath: join2(homedir2(), ".memarium", "session-repo"),
    repoUrl: "",
    deviceBranch: "",
    runner: "claude-cli",
    enableAggregateCI: false,
    includeReasoning: true,
    threadingConcurrency: 4,
    threadingMaxAttempts: 3,
    digestEnabled: true
  };
}
function readPluginConfig() {
  migrateLegacyConfigDir();
  if (!existsSync2(configPath2())) return defaultPluginConfig();
  try {
    const raw = readFileSync2(configPath2(), "utf8");
    return JSON.parse(raw);
  } catch {
    return defaultPluginConfig();
  }
}
var init_plugin_config = __esm({
  "src/spool/plugin-config.ts"() {
    "use strict";
    init_config();
  }
});

// src/_shared/repo-data-dir.ts
import { join as join3 } from "node:path";
function dataDirAbs(repoPath) {
  return join3(repoPath, REPO_DATA_DIR);
}
var REPO_DATA_DIR, INDEX_REL;
var init_repo_data_dir = __esm({
  "src/_shared/repo-data-dir.ts"() {
    "use strict";
    REPO_DATA_DIR = ".memarium";
    INDEX_REL = `${REPO_DATA_DIR}/index.json`;
  }
});

// src/_shared/index-store.ts
import { mkdirSync as mkdirSync2, readFileSync as readFileSync3, writeFileSync as writeFileSync2, existsSync as existsSync3 } from "node:fs";
import { join as join4 } from "node:path";
function loadIndex(repoRoot) {
  const p2 = join4(repoRoot, INDEX_REL);
  if (!existsSync3(p2)) return { version: 1, entries: {} };
  const parsed = JSON.parse(readFileSync3(p2, "utf8"));
  if (parsed.version !== 1) throw new Error(`unsupported index version: ${parsed.version}`);
  return parsed;
}
function saveIndex(repoRoot, idx) {
  const p2 = join4(repoRoot, INDEX_REL);
  mkdirSync2(dataDirAbs(repoRoot), { recursive: true });
  writeFileSync2(p2, JSON.stringify(idx, null, 2) + "\n");
}
function keyFor(tool, sessionId) {
  return `${tool}:${sessionId}`;
}
function upsertEntry(idx, entry) {
  idx.entries[keyFor(entry.tool, entry.sessionId)] = entry;
}
function hasUnchanged(idx, tool, sessionId, mtimeMs, sha256) {
  const e = idx.entries[keyFor(tool, sessionId)];
  return !!e && e.sourceMtimeMs === mtimeMs && e.sourceSha256 === sha256;
}
var init_index_store = __esm({
  "src/_shared/index-store.ts"() {
    "use strict";
    init_repo_data_dir();
  }
});

// src/memory/types.ts
function memoryKey(entry) {
  return entry.id;
}
function emptyMemoryIndex() {
  return { version: 1, entries: {} };
}
var init_types2 = __esm({
  "src/memory/types.ts"() {
    "use strict";
  }
});

// src/memory/index-store.ts
import { existsSync as existsSync4, mkdirSync as mkdirSync3, readFileSync as readFileSync4, writeFileSync as writeFileSync3 } from "node:fs";
import { dirname, join as join5 } from "node:path";
function loadMemoryIndex(repoRoot) {
  const p2 = join5(repoRoot, MEMORY_INDEX_REL);
  if (!existsSync4(p2)) return emptyMemoryIndex();
  try {
    const parsed = JSON.parse(readFileSync4(p2, "utf8"));
    if (parsed.version !== 1 || !parsed.entries) return emptyMemoryIndex();
    return parsed;
  } catch {
    return emptyMemoryIndex();
  }
}
function saveMemoryIndex(repoRoot, idx) {
  const p2 = join5(repoRoot, MEMORY_INDEX_REL);
  mkdirSync3(dirname(p2), { recursive: true });
  writeFileSync3(p2, JSON.stringify(idx, null, 2) + "\n");
}
function upsertMemory(idx, entry) {
  idx.entries[memoryKey(entry)] = entry;
}
var MEMORY_INDEX_REL;
var init_index_store2 = __esm({
  "src/memory/index-store.ts"() {
    "use strict";
    init_repo_data_dir();
    init_types2();
    MEMORY_INDEX_REL = `${REPO_DATA_DIR}/index.memory.json`;
  }
});

// src/spool/skip-store.ts
import { mkdirSync as mkdirSync4, readFileSync as readFileSync5, writeFileSync as writeFileSync4, existsSync as existsSync5 } from "node:fs";
import { join as join6 } from "node:path";
function loadSkips(repoRoot) {
  const p2 = join6(repoRoot, SKIP_INDEX_REL);
  if (!existsSync5(p2)) return { version: 1, sessions: {} };
  try {
    const parsed = JSON.parse(readFileSync5(p2, "utf8"));
    if (parsed?.version !== 1 || typeof parsed.sessions !== "object" || !parsed.sessions || Array.isArray(parsed.sessions)) {
      return { version: 1, sessions: {} };
    }
    return parsed;
  } catch {
    return { version: 1, sessions: {} };
  }
}
function saveSkips(repoRoot, idx) {
  mkdirSync4(dataDirAbs(repoRoot), { recursive: true });
  writeFileSync4(join6(repoRoot, SKIP_INDEX_REL), JSON.stringify(idx, null, 2) + "\n");
}
function upsertSkips(idx, sessions, at) {
  let added = 0;
  for (const s of sessions) {
    const id = typeof s?.sessionId === "string" ? s.sessionId.trim() : "";
    if (!id) continue;
    if (!idx.sessions[id]) added++;
    const prev = idx.sessions[id];
    const reason = typeof s.reason === "string" && s.reason.trim() ? s.reason.slice(0, 200) : prev?.reason ?? "skipped";
    idx.sessions[id] = { reason, at: prev?.at ?? at };
  }
  return added;
}
var SKIP_INDEX_REL;
var init_skip_store = __esm({
  "src/spool/skip-store.ts"() {
    "use strict";
    init_repo_data_dir();
    SKIP_INDEX_REL = `${REPO_DATA_DIR}/index.skips.json`;
  }
});

// src/digest/consumed.ts
function consumedSessions(repoPath) {
  const consumed = /* @__PURE__ */ new Set();
  for (const e of Object.values(loadMemoryIndex(repoPath).entries)) {
    if (!e || typeof e !== "object") continue;
    if (e.type !== "episodic") continue;
    const ss = e.sourceSessions;
    if (Array.isArray(ss)) {
      for (const sid of ss) if (typeof sid === "string") consumed.add(sid);
    }
  }
  for (const sid of Object.keys(loadSkips(repoPath).sessions)) consumed.add(sid);
  return consumed;
}
var init_consumed = __esm({
  "src/digest/consumed.ts"() {
    "use strict";
    init_index_store2();
    init_skip_store();
  }
});

// src/_shared/digest/project-filter.ts
function isRealProjectPath(slugOrPath) {
  if (!slugOrPath || slugOrPath === "root" || slugOrPath === "home") return false;
  const lower = slugOrPath.toLowerCase();
  if (lower.includes(".worktrees-")) return false;
  if (lower.endsWith(".code-workspace") || lower.endsWith("-workspacestorage")) return false;
  if (lower.endsWith("-workspace.json")) return false;
  if (/^\d{10,}/.test(slugOrPath)) return false;
  if (/^[a-f0-9]{20,}$/.test(slugOrPath)) return false;
  return true;
}
var init_project_filter = __esm({
  "src/_shared/digest/project-filter.ts"() {
    "use strict";
  }
});

// src/commands/list-projects.ts
var list_projects_exports = {};
__export(list_projects_exports, {
  buildListProjectsPayload: () => buildListProjectsPayload,
  listProjectsCmd: () => listProjectsCmd
});
function buildListProjectsPayload(cwd = process.cwd()) {
  const cfg = readPluginConfig();
  const indexFile = loadIndex(cfg.repoPath);
  const memIndex = loadMemoryIndex(cfg.repoPath);
  const consumed = consumedSessions(cfg.repoPath);
  const stats = /* @__PURE__ */ new Map();
  const ensure = (project) => {
    let s = stats.get(project);
    if (!s) {
      s = {
        project,
        totalSessions: 0,
        consumedSessions: 0,
        pendingSessions: 0,
        episodes: 0,
        memories: 0,
        lastTouchedAt: null
      };
      stats.set(project, s);
    }
    return s;
  };
  for (const e of Object.values(indexFile.entries)) {
    if (!isRealProjectPath(e.project)) continue;
    const s = ensure(e.project);
    s.totalSessions++;
    if (consumed.has(e.sessionId)) s.consumedSessions++;
  }
  const MEMORY_TYPES2 = /* @__PURE__ */ new Set(["core", "semantic", "episodic", "procedural"]);
  for (const e of Object.values(memIndex.entries)) {
    if (!e || typeof e !== "object") continue;
    const m = e;
    if (typeof m.project !== "string" || !isRealProjectPath(m.project)) continue;
    if (typeof m.type !== "string" || !MEMORY_TYPES2.has(m.type)) continue;
    const s = ensure(m.project);
    s.memories++;
    if (m.type === "episodic") s.episodes++;
    if (typeof m.updatedAt === "string") s.lastTouchedAt = laterOf(s.lastTouchedAt, m.updatedAt);
  }
  for (const s of stats.values()) {
    s.pendingSessions = s.totalSessions - s.consumedSessions;
  }
  const projects = [...stats.values()].sort((a, b2) => {
    if (a.pendingSessions !== b2.pendingSessions) return b2.pendingSessions - a.pendingSessions;
    return a.project.localeCompare(b2.project);
  });
  return {
    projects,
    meta: {
      isInSessionRepo: pathsEqual(cwd, cfg.repoPath),
      sessionRepoPath: cfg.repoPath
    }
  };
}
function laterOf(a, b2) {
  if (!a) return b2;
  return a > b2 ? a : b2;
}
function pathsEqual(a, b2) {
  const trim = (p2) => p2.replace(/\/+$/, "");
  return trim(a) === trim(b2);
}
async function listProjectsCmd() {
  const payload = buildListProjectsPayload();
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
var init_list_projects = __esm({
  "src/commands/list-projects.ts"() {
    "use strict";
    init_plugin_config();
    init_index_store();
    init_index_store2();
    init_consumed();
    init_project_filter();
  }
});

// src/qa/types.ts
function qaKey(e) {
  return e.id;
}
function emptyQaIndex() {
  return { version: 1, entries: {} };
}
var init_types3 = __esm({
  "src/qa/types.ts"() {
    "use strict";
  }
});

// src/qa/index-store.ts
import { existsSync as existsSync6, mkdirSync as mkdirSync5, readFileSync as readFileSync6, writeFileSync as writeFileSync5 } from "node:fs";
import { dirname as dirname2, join as join7 } from "node:path";
function loadQaIndex(repoRoot) {
  const p2 = join7(repoRoot, QA_INDEX_REL);
  if (!existsSync6(p2)) return emptyQaIndex();
  try {
    const parsed = JSON.parse(readFileSync6(p2, "utf8"));
    if (parsed.version !== 1 || !parsed.entries) return emptyQaIndex();
    return parsed;
  } catch {
    return emptyQaIndex();
  }
}
function saveQaIndex(repoRoot, idx) {
  const p2 = join7(repoRoot, QA_INDEX_REL);
  mkdirSync5(dirname2(p2), { recursive: true });
  writeFileSync5(p2, JSON.stringify(idx, null, 2) + "\n");
}
function upsertQa(idx, entry) {
  idx.entries[qaKey(entry)] = entry;
}
var QA_INDEX_REL;
var init_index_store3 = __esm({
  "src/qa/index-store.ts"() {
    "use strict";
    init_repo_data_dir();
    init_types3();
    QA_INDEX_REL = `${REPO_DATA_DIR}/index.qa.json`;
  }
});

// src/entity/types.ts
function entityKey(e) {
  return e.id;
}
function emptyEntityIndex() {
  return { version: 1, entries: {} };
}
var init_types4 = __esm({
  "src/entity/types.ts"() {
    "use strict";
  }
});

// src/entity/index-store.ts
import { existsSync as existsSync7, mkdirSync as mkdirSync6, readFileSync as readFileSync7, writeFileSync as writeFileSync6 } from "node:fs";
import { dirname as dirname3, join as join8 } from "node:path";
function loadEntityIndex(repoRoot) {
  const p2 = join8(repoRoot, ENTITY_INDEX_REL);
  if (!existsSync7(p2)) return emptyEntityIndex();
  try {
    const parsed = JSON.parse(readFileSync7(p2, "utf8"));
    if (parsed.version !== 1 || !parsed.entries) return emptyEntityIndex();
    return parsed;
  } catch {
    return emptyEntityIndex();
  }
}
function saveEntityIndex(repoRoot, idx) {
  const p2 = join8(repoRoot, ENTITY_INDEX_REL);
  mkdirSync6(dirname3(p2), { recursive: true });
  writeFileSync6(p2, JSON.stringify(idx, null, 2) + "\n");
}
function upsertEntity(idx, entry) {
  idx.entries[entityKey(entry)] = entry;
}
var ENTITY_INDEX_REL;
var init_index_store4 = __esm({
  "src/entity/index-store.ts"() {
    "use strict";
    init_repo_data_dir();
    init_types4();
    ENTITY_INDEX_REL = `${REPO_DATA_DIR}/index.entity.json`;
  }
});

// src/memory/source-resolver.ts
import { existsSync as existsSync8 } from "node:fs";
import { homedir as homedir3 } from "node:os";
import { join as join9 } from "node:path";
function aggregatedOverlayPath() {
  return join9(homedir3(), ".memarium", "aggregated");
}
function mergeIndexById(local, overlay) {
  const entries = {};
  const sources = {};
  for (const [id, e] of Object.entries(overlay)) {
    entries[id] = e;
    sources[id] = "overlay";
  }
  for (const [id, e] of Object.entries(local)) {
    const ex = entries[id];
    if (!ex || (e.updatedAt ?? "") >= (ex.updatedAt ?? "")) {
      entries[id] = e;
      sources[id] = "local";
    }
  }
  return { entries, sources };
}
function resolveMemoryView(repoPath, overlayRoot = aggregatedOverlayPath()) {
  const local = loadMemoryIndex(repoPath).entries;
  let overlayEntries = {};
  let overlayPresent = false;
  if (overlayRoot && overlayRoot !== repoPath && existsSync8(join9(overlayRoot, MEMORY_INDEX_REL))) {
    overlayPresent = true;
    overlayEntries = loadMemoryIndex(overlayRoot).entries;
  }
  const { entries, sources } = mergeIndexById(local, overlayEntries);
  return {
    entries,
    sources,
    roots: { local: repoPath, overlay: overlayPresent ? overlayRoot : null },
    overlayPresent
  };
}
function resolveEntryAbsPath(view, id) {
  const e = view.entries[id];
  if (!e) return null;
  const root = view.sources[id] === "overlay" && view.roots.overlay ? view.roots.overlay : view.roots.local;
  return join9(root, e.path);
}
var init_source_resolver = __esm({
  "src/memory/source-resolver.ts"() {
    "use strict";
    init_index_store2();
  }
});

// src/commands/status.ts
var status_exports = {};
__export(status_exports, {
  buildStatusPayload: () => buildStatusPayload,
  statusCmd: () => statusCmd
});
function buildStatusPayload(cwd = process.cwd()) {
  const cfg = readPluginConfig();
  const lp = buildListProjectsPayload(cwd);
  let total = 0, digested = 0, pending = 0, episodes = 0;
  for (const p2 of lp.projects) {
    total += p2.totalSessions;
    digested += p2.consumedSessions;
    pending += p2.pendingSessions;
    episodes += p2.episodes;
  }
  const pendingByProject = lp.projects.filter((p2) => p2.pendingSessions > 0).map((p2) => ({ project: p2.project, pending: p2.pendingSessions }));
  const localIdx = loadMemoryIndex(cfg.repoPath);
  const localMem = Object.keys(localIdx.entries).length;
  const view = resolveMemoryView(cfg.repoPath);
  const siblingOnly = Object.keys(view.entries).filter((id) => !(id in localIdx.entries)).length;
  return {
    sessions: {
      total,
      digested,
      pending,
      coveragePct: total > 0 ? Math.round(digested / total * 100) : 0
    },
    episodes,
    memory: {
      typedMemory: localMem,
      entities: Object.keys(loadEntityIndex(cfg.repoPath).entries).length,
      qa: Object.keys(loadQaIndex(cfg.repoPath).entries).length
    },
    crossDevice: {
      overlayPresent: view.overlayPresent,
      overlayPath: view.roots.overlay,
      memory: { local: localMem, merged: Object.keys(view.entries).length, siblingOnly }
    },
    pendingByProject,
    meta: { sessionRepoPath: cfg.repoPath }
  };
}
async function statusCmd() {
  process.stdout.write(JSON.stringify(buildStatusPayload(), null, 2) + "\n");
}
var init_status = __esm({
  "src/commands/status.ts"() {
    "use strict";
    init_plugin_config();
    init_list_projects();
    init_index_store2();
    init_index_store3();
    init_index_store4();
    init_source_resolver();
  }
});

// src/_shared/digest/session-signal.ts
function isMemariumMetaSession(mdBody) {
  const userTexts = extractUserTexts(mdBody);
  const first2 = (userTexts[0] ?? "").trimStart();
  if (/^\/memarium(\b|$)/i.test(first2)) return true;
  if (/^\/loop\s+\/memarium(\b|$)/i.test(first2)) return true;
  if (first2.includes("skills/memarium/SKILL.md")) return true;
  return false;
}
function extractSessionSignals(mdBody) {
  const userTexts = extractUserTexts(mdBody);
  const joined = userTexts.join(" ").replace(/\s+/g, " ").trim();
  const titleSrc = userTexts[0] ?? "";
  const titleClean = titleSrc.replace(/\s+/g, " ").trim();
  const title = titleClean.length > 80 ? titleClean.slice(0, 80) : titleClean;
  const preview = joined.length > 300 ? joined.slice(0, 300) + "\u2026" : joined;
  const score = scoreText(joined, userTexts.join(" ").length, mdBody.length);
  return { title, preview, insightScore: score };
}
function extractUserTexts(md) {
  const out = [];
  const lines = md.split("\n");
  let inUser = false;
  let buf = [];
  for (const line of lines) {
    if (/^## User\b/.test(line)) {
      if (buf.length > 0) {
        out.push(buf.join("\n").trim());
        buf = [];
      }
      inUser = true;
      continue;
    }
    if (/^## /.test(line)) {
      if (inUser && buf.length > 0) {
        out.push(buf.join("\n").trim());
        buf = [];
      }
      inUser = false;
      continue;
    }
    if (inUser) buf.push(line);
  }
  if (inUser && buf.length > 0) out.push(buf.join("\n").trim());
  return out.filter((s) => s.length > 0);
}
function scoreText(joinedLower, userTextLen, totalLen) {
  if (!joinedLower) return 0;
  const lower = joinedLower.toLowerCase();
  let categoryHits = 0;
  let totalHits = 0;
  for (const keywords of Object.values(SIGNAL_CATEGORIES)) {
    const hits = keywords.filter((kw) => lower.includes(kw)).length;
    if (hits > 0) {
      categoryHits++;
      totalHits += hits;
    }
  }
  if (categoryHits < 2) return 0.1;
  const userRatio = userTextLen / Math.max(totalLen, 1);
  const score = categoryHits / 5 * 0.4 + totalHits / 15 * 0.3 + userRatio * 0.3;
  return Math.min(1, score);
}
var SIGNAL_CATEGORIES;
var init_session_signal = __esm({
  "src/_shared/digest/session-signal.ts"() {
    "use strict";
    SIGNAL_CATEGORIES = {
      debugging: ["bug", "error", "fix", "debug", "root cause", "traceback", "broken", "\u95EE\u9898", "\u4FEE\u590D"],
      architecture: ["architecture", "design", "pattern", "trade-off", "decision", "approach", "\u67B6\u6784", "\u8BBE\u8BA1"],
      discovery: ["learned", "discovered", "insight", "gotcha", "trap", "pitfall", "trick", "\u53D1\u73B0", "\u9677\u9631", "\u5173\u952E"],
      reasoning: ["because", "instead of", "rather than", "why", "the reason", "\u539F\u56E0", "\u6240\u4EE5", "\u56E0\u4E3A"],
      evaluation: ["review", "evaluate", "score", "verdict", "assessment", "\u8BC4\u4F30", "\u5BA1\u67E5"]
    };
  }
});

// src/_shared/slug.ts
function deriveSlug(firstUserMessage) {
  const collapsed = firstUserMessage.trim().replace(/\s+/g, " ");
  const display = collapsed.slice(0, 120) || "untitled";
  let slug = collapsed.replace(UNSAFE, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  slug = slug.slice(0, 60);
  if (!slug) slug = "untitled";
  return { slug, display };
}
function projectSlugFromPath(cwdOrPath) {
  if (!cwdOrPath || cwdOrPath === "/") return "root";
  const parts = cwdOrPath.split("/").filter(Boolean);
  if (parts.length === 0) return "root";
  if (parts.length === 1) return parts[0];
  const last2 = parts[parts.length - 1];
  const parent = parts[parts.length - 2];
  if (parent === "Users" || parent === "home") return "home";
  return `${parent}-${last2}`;
}
var UNSAFE;
var init_slug = __esm({
  "src/_shared/slug.ts"() {
    "use strict";
    UNSAFE = /[\\/:*?"<>|\s.,;!()[\]{}@#$%^&+=`~]+/g;
  }
});

// node_modules/ms/index.js
var require_ms = __commonJS({
  "node_modules/ms/index.js"(exports, module) {
    var s = 1e3;
    var m = s * 60;
    var h2 = m * 60;
    var d = h2 * 24;
    var w = d * 7;
    var y2 = d * 365.25;
    module.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str2) {
      str2 = String(str2);
      if (str2.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str2
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y2;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h2;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h2) {
        return Math.round(ms / h2) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h2) {
        return plural(ms, msAbs, h2, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// node_modules/debug/src/common.js
var require_common = __commonJS({
  "node_modules/debug/src/common.js"(exports, module) {
    function setup(env2) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce2;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env2).forEach((key) => {
        createDebug[key] = env2[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash = 0;
        for (let i2 = 0; i2 < namespace.length; i2++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i2);
          hash |= 0;
        }
        return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug2(...args) {
          if (!debug2.enabled) {
            return;
          }
          const self = debug2;
          const curr = Number(/* @__PURE__ */ new Date());
          const ms = curr - (prevTime || curr);
          self.diff = ms;
          self.prev = prevTime;
          self.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === "%%") {
              return "%";
            }
            index++;
            const formatter = createDebug.formatters[format];
            if (typeof formatter === "function") {
              const val = args[index];
              match = formatter.call(self, val);
              args.splice(index, 1);
              index--;
            }
            return match;
          });
          createDebug.formatArgs.call(self, args);
          const logFn = self.log || createDebug.log;
          logFn.apply(self, args);
        }
        debug2.namespace = namespace;
        debug2.useColors = createDebug.useColors();
        debug2.color = createDebug.selectColor(namespace);
        debug2.extend = extend;
        debug2.destroy = createDebug.destroy;
        Object.defineProperty(debug2, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v) => {
            enableOverride = v;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug2);
        }
        return debug2;
      }
      function extend(namespace, delimiter) {
        const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
        for (const ns of split) {
          if (ns[0] === "-") {
            createDebug.skips.push(ns.slice(1));
          } else {
            createDebug.names.push(ns);
          }
        }
      }
      function matchesTemplate(search, template) {
        let searchIndex = 0;
        let templateIndex = 0;
        let starIndex = -1;
        let matchIndex = 0;
        while (searchIndex < search.length) {
          if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
            if (template[templateIndex] === "*") {
              starIndex = templateIndex;
              matchIndex = searchIndex;
              templateIndex++;
            } else {
              searchIndex++;
              templateIndex++;
            }
          } else if (starIndex !== -1) {
            templateIndex = starIndex + 1;
            matchIndex++;
            searchIndex = matchIndex;
          } else {
            return false;
          }
        }
        while (templateIndex < template.length && template[templateIndex] === "*") {
          templateIndex++;
        }
        return templateIndex === template.length;
      }
      function disable() {
        const namespaces = [
          ...createDebug.names,
          ...createDebug.skips.map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        for (const skip of createDebug.skips) {
          if (matchesTemplate(name, skip)) {
            return false;
          }
        }
        for (const ns of createDebug.names) {
          if (matchesTemplate(name, ns)) {
            return true;
          }
        }
        return false;
      }
      function coerce2(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module.exports = setup;
  }
});

// node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "node_modules/debug/src/browser.js"(exports, module) {
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.storage = localstorage();
    exports.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c3 = "color: " + this.color;
      args.splice(1, 0, c3, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c3);
    }
    exports.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports.storage.setItem("debug", namespaces);
        } else {
          exports.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r2;
      try {
        r2 = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r2 && typeof process !== "undefined" && "env" in process) {
        r2 = process.env.DEBUG;
      }
      return r2;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module.exports = require_common()(exports);
    var { formatters } = module.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  }
});

// node_modules/debug/src/node.js
var require_node = __commonJS({
  "node_modules/debug/src/node.js"(exports, module) {
    var tty2 = __require("tty");
    var util2 = __require("util");
    exports.init = init;
    exports.log = log;
    exports.formatArgs = formatArgs;
    exports.save = save;
    exports.load = load;
    exports.useColors = useColors;
    exports.destroy = util2.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor2 = __require("supports-color");
      if (supportsColor2 && (supportsColor2.stderr || supportsColor2).level >= 2) {
        exports.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_2, k2) => {
        return k2.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports.inspectOpts ? Boolean(exports.inspectOpts.colors) : tty2.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c3 = this.color;
        const colorCode = "\x1B[3" + (c3 < 8 ? c3 : "8;5;" + c3);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util2.formatWithOptions(exports.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug2) {
      debug2.inspectOpts = {};
      const keys = Object.keys(exports.inspectOpts);
      for (let i2 = 0; i2 < keys.length; i2++) {
        debug2.inspectOpts[keys[i2]] = exports.inspectOpts[keys[i2]];
      }
    }
    module.exports = require_common()(exports);
    var { formatters } = module.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util2.inspect(v, this.inspectOpts).split("\n").map((str2) => str2.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util2.inspect(v, this.inspectOpts);
    };
  }
});

// node_modules/debug/src/index.js
var require_src = __commonJS({
  "node_modules/debug/src/index.js"(exports, module) {
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module.exports = require_browser();
    } else {
      module.exports = require_node();
    }
  }
});

// node_modules/@kwsites/file-exists/dist/src/index.js
var require_src2 = __commonJS({
  "node_modules/@kwsites/file-exists/dist/src/index.js"(exports) {
    "use strict";
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var fs_1 = __require("fs");
    var debug_1 = __importDefault(require_src());
    var log = debug_1.default("@kwsites/file-exists");
    function check(path, isFile, isDirectory) {
      log(`checking %s`, path);
      try {
        const stat = fs_1.statSync(path);
        if (stat.isFile() && isFile) {
          log(`[OK] path represents a file`);
          return true;
        }
        if (stat.isDirectory() && isDirectory) {
          log(`[OK] path represents a directory`);
          return true;
        }
        log(`[FAIL] path represents something other than a file or directory`);
        return false;
      } catch (e) {
        if (e.code === "ENOENT") {
          log(`[FAIL] path is not accessible: %o`, e);
          return false;
        }
        log(`[FATAL] %o`, e);
        throw e;
      }
    }
    function exists2(path, type = exports.READABLE) {
      return check(path, (type & exports.FILE) > 0, (type & exports.FOLDER) > 0);
    }
    exports.exists = exists2;
    exports.FILE = 1;
    exports.FOLDER = 2;
    exports.READABLE = exports.FILE + exports.FOLDER;
  }
});

// node_modules/@kwsites/file-exists/dist/index.js
var require_dist = __commonJS({
  "node_modules/@kwsites/file-exists/dist/index.js"(exports) {
    "use strict";
    function __export3(m) {
      for (var p2 in m) if (!exports.hasOwnProperty(p2)) exports[p2] = m[p2];
    }
    Object.defineProperty(exports, "__esModule", { value: true });
    __export3(require_src2());
  }
});

// node_modules/@simple-git/args-pathspec/dist/index.mjs
function c(...n) {
  const e = new String(n);
  return t.set(e, n), e;
}
function r(n) {
  return n instanceof String && t.has(n);
}
function o(n) {
  return t.get(n) ?? [];
}
var t;
var init_dist = __esm({
  "node_modules/@simple-git/args-pathspec/dist/index.mjs"() {
    t = /* @__PURE__ */ new WeakMap();
  }
});

// node_modules/@kwsites/promise-deferred/dist/index.js
var require_dist2 = __commonJS({
  "node_modules/@kwsites/promise-deferred/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createDeferred = exports.deferred = void 0;
    function deferred2() {
      let done;
      let fail;
      let status = "pending";
      const promise = new Promise((_done, _fail) => {
        done = _done;
        fail = _fail;
      });
      return {
        promise,
        done(result) {
          if (status === "pending") {
            status = "resolved";
            done(result);
          }
        },
        fail(error) {
          if (status === "pending") {
            status = "rejected";
            fail(error);
          }
        },
        get fulfilled() {
          return status !== "pending";
        },
        get status() {
          return status;
        }
      };
    }
    exports.deferred = deferred2;
    exports.createDeferred = deferred2;
    exports.default = deferred2;
  }
});

// node_modules/@simple-git/argv-parser/dist/index.mjs
function* U(e, t2) {
  const n = t2 === "global";
  for (const o2 of e)
    o2.isGlobal === n && (yield o2);
}
function F(e, t2) {
  for (const { name: o2 } of U(e, "task")) {
    if (k.has(o2))
      return p(true, t2);
    if (S.has(o2))
      return p(false, t2);
  }
  const n = t2.at(0)?.toLowerCase();
  return n === void 0 ? null : P.has(n) ? p(true, t2.slice(1)) : E.has(n) ? p(false, t2.slice(1)) : t2.length === 1 ? p(false, t2) : p(true, t2);
}
function p(e = false, t2 = []) {
  const n = t2.at(0)?.toLowerCase();
  return n === void 0 ? null : {
    isWrite: e,
    isRead: !e,
    key: n,
    value: t2.at(1)
  };
}
function A(e, t2) {
  return t2.isWrite && t2.value !== void 0 ? { key: t2.key, value: t2.value, scope: e } : { key: t2.key, scope: e };
}
function M(e) {
  const t2 = e?.indexOf("=") || -1;
  return !e || t2 < 0 ? null : {
    key: e.slice(0, t2).trim().toLowerCase(),
    value: e.slice(t2 + 1)
  };
}
function N(e) {
  for (const { name: t2 } of U(e, "task"))
    switch (t2) {
      case "--global":
        return "global";
      case "--system":
        return "system";
      case "--worktree":
        return "worktree";
      case "--local":
        return "local";
      case "--file":
      case "-f":
        return "file";
    }
  return "local";
}
function G({ name: e }) {
  if (e === "-c" || e === "--config")
    return "inline";
  if (e === "--config-env")
    return "env";
}
function* O(e) {
  for (const t2 of e) {
    const n = G(t2), o2 = n && M(t2.value);
    o2 && (yield {
      ...o2,
      scope: n
    });
  }
}
function L(e, t2, n) {
  const o2 = {
    read: [],
    write: [...O(t2)]
  };
  return e === "config" && $(
    o2,
    N(t2),
    F(t2, n)
  ), o2;
}
function $(e, t2, n) {
  if (n === null)
    return;
  const o2 = A(t2, n);
  n.isWrite ? e.write.push(o2) : e.read.push(o2);
}
function I(e) {
  const t2 = R[e ?? ""] ?? T;
  return {
    short: new Map([...x.short.entries(), ...t2.short.entries()]),
    long: t2.long
  };
}
function b(e, t2 = D) {
  if (e.startsWith("--")) {
    const n = e.indexOf("=");
    if (n > 2)
      return [{ name: e.slice(0, n), value: e.slice(n + 1), needsNext: false }];
    const o2 = e.slice(2);
    return [{ name: e, needsNext: t2.long.has(o2) }];
  }
  if (e.length === 2) {
    const n = e.charAt(1), o2 = t2.short.get(n);
    return [{ name: e, needsNext: o2 === true }];
  }
  return W(e, t2.short);
}
function W(e, t2) {
  const n = e.slice(1).split(""), o2 = [];
  for (let s = 0; s < n.length; s++) {
    const r2 = n[s], l = t2.get(r2);
    if (l === void 0)
      return [{ name: e, needsNext: false }];
    if (l) {
      const a = n.slice(s + 1).join("");
      if (a && ![...a].every((w) => t2.has(w)))
        return o2.push({ name: `-${r2}`, value: a, needsNext: false }), o2;
    }
    o2.push({ name: `-${r2}`, needsNext: l });
  }
  return o2;
}
function j(e, t2 = []) {
  let n = 0;
  for (; n < e.length; ) {
    const o2 = String(e[n]);
    if (!o2.startsWith("-") || o2.length < 2) break;
    const s = b(o2);
    let r2 = n + 1;
    for (const l of s) {
      const a = {
        name: l.name,
        value: l.value,
        absorbedNext: false,
        isGlobal: true
      };
      l.needsNext && a.value === void 0 && r2 < e.length && (a.value = String(e[r2]), a.absorbedNext = true, r2++), t2.push(a);
    }
    n = r2;
  }
  return { flags: t2, taskIndex: n };
}
function B(e, t2, n = []) {
  const o2 = I(t2), s = [], r2 = [];
  let l = 0;
  for (; l < e.length; ) {
    const a = e[l];
    if (r(a)) {
      r2.push(...o(a)), l++;
      continue;
    }
    const f = String(a);
    if (f === "--") {
      for (let g = l + 1; g < e.length; g++) {
        const u = e[g];
        r(u) ? r2.push(...o(u)) : r2.push(String(u));
      }
      break;
    }
    if (!f.startsWith("-") || f.length < 2) {
      s.push(f), l++;
      continue;
    }
    const w = b(f, o2);
    let d = l + 1;
    for (const g of w) {
      const u = {
        name: g.name,
        value: g.value,
        absorbedNext: false,
        isGlobal: false
      };
      g.needsNext && u.value === void 0 && d < e.length && !r(e[d]) && (u.value = String(e[d]), u.absorbedNext = true, d++), n.push(u);
    }
    l = d;
  }
  return { flags: n, positionals: s, pathspecs: r2 };
}
function* V({
  write: e
}) {
  for (const t2 of e)
    for (const n of q) {
      const o2 = n(t2.key);
      o2 && (yield o2);
    }
}
function c2(e, t2, n = String(e)) {
  const o2 = typeof e == "string" ? new RegExp(`\\s*${e.toLowerCase()}`) : e;
  return function(r2) {
    if (o2.test(r2))
      return {
        category: t2,
        message: `Configuring ${n} is not permitted without enabling ${t2}`
      };
  };
}
function i(e, t2) {
  const n = new RegExp(`\\s*${e.toLowerCase().replace(/\./g, "(..+)?.")}`);
  return c2(n, t2, e);
}
function* K(e, t2) {
  for (const n of t2)
    for (const o2 of H) {
      const s = o2(e, n.name);
      s && (yield s);
    }
}
function h(e, t2, n, o2 = String(t2)) {
  const s = typeof t2 == "string" ? new RegExp(`\\s*${t2.toLowerCase()}`) : t2, r2 = `Use of ${e ? `${e} with option ` : ""}${o2} is not permitted without enabling ${n}`;
  return function(a, f) {
    if ((!e || a === e) && s.test(f))
      return {
        category: n,
        message: r2
      };
  };
}
function C(e, t2, n) {
  return [...K(e, t2), ...V(n)];
}
function Y(...e) {
  const { flags: t2, taskIndex: n } = j(e), o2 = n < e.length ? String(e[n]).toLowerCase() : null, s = o2 !== null ? e.slice(n + 1) : [], { positionals: r2, pathspecs: l } = B(s, o2, t2), a = L(o2, t2, r2);
  return {
    task: o2,
    flags: t2.map(J),
    paths: l,
    config: a,
    vulnerabilities: z(C(o2, t2, a))
  };
}
function z(e) {
  return Object.defineProperty(e, "vulnerabilities", {
    value: e
  });
}
function J({ value: e, name: t2 }) {
  return e !== void 0 ? { name: t2, value: e } : { name: t2 };
}
function* Q(e) {
  const t2 = parseInt(e.git_config_count ?? "0", 10);
  for (let n = 0; n < t2; n++) {
    const o2 = e[`git_config_key_${n}`], s = e[`git_config_value_${n}`];
    o2 !== void 0 && (yield { key: o2.toLowerCase().trim(), value: s, scope: "env" });
  }
}
function* X(e) {
  for (const t2 of Object.keys(e))
    if (_(t2)) {
      const n = y[t2];
      yield {
        category: n,
        message: `Use of "${t2.toUpperCase()}" is not permitted without enabling ${n}`
      };
    }
}
function _(e) {
  return Object.hasOwn(y, e);
}
function Z(e) {
  const t2 = {};
  for (const [n, o2] of Object.entries(e)) {
    const s = n.toLowerCase().trim();
    (_(s) || s.startsWith("git")) && (t2[s] = String(o2));
  }
  return t2;
}
function ee(e) {
  const t2 = Z(e), n = {
    read: [],
    write: [...Q(t2)]
  }, o2 = [
    ...X(t2),
    ...C(null, [], n)
  ];
  return {
    config: n,
    vulnerabilities: o2
  };
}
function ne(e, t2) {
  return [...Y(...e).vulnerabilities, ...ee(t2).vulnerabilities];
}
var k, S, P, E, x, D, R, T, q, H, y;
var init_dist2 = __esm({
  "node_modules/@simple-git/argv-parser/dist/index.mjs"() {
    init_dist();
    k = /* @__PURE__ */ new Set([
      "--add",
      "--edit",
      "--remove-section",
      "--rename-section",
      "--replace-all",
      "--unset",
      "--unset-all",
      "-e"
    ]);
    S = /* @__PURE__ */ new Set([
      "--get",
      "--get-all",
      "--get-color",
      "--get-colorbool",
      "--get-regexp",
      "--get-urlmatch",
      "--list",
      "-l"
    ]);
    P = /* @__PURE__ */ new Set([
      "edit",
      "remove-section",
      "rename-section",
      "set",
      "unset"
    ]);
    E = /* @__PURE__ */ new Set(["get", "get-color", "get-colorbool", "list"]);
    x = {
      short: /* @__PURE__ */ new Map([
        ["c", true]
        //  -c <k=v>    set config key for this invocation
      ])
    };
    D = {
      short: new Map([
        ["C", true],
        //  -C <path>   change working directory
        ["P", false],
        // -P          no pager (alias for --no-pager)
        ["h", false],
        // -h          help
        ["p", false],
        // -p          paginate
        ["v", false],
        // -v          version
        ...x.short.entries()
      ]),
      long: /* @__PURE__ */ new Set([
        "attr-source",
        "config-env",
        "exec-path",
        "git-dir",
        "list-cmds",
        "namespace",
        "super-prefix",
        "work-tree"
      ])
    };
    R = {
      clone: {
        short: /* @__PURE__ */ new Map([
          ["b", true],
          // -b <branch>
          ["j", true],
          // -j <n>          parallel jobs
          ["l", false],
          // -l local
          ["n", false],
          // -n no-checkout
          ["o", true],
          // -o <name>       remote name
          ["q", false],
          // -q quiet
          ["s", false],
          // -s shared
          ["u", true]
          // -u <upload-pack>
        ]),
        long: /* @__PURE__ */ new Set(["branch", "config", "jobs", "origin", "upload-pack", "u", "template"])
      },
      commit: {
        short: /* @__PURE__ */ new Map([
          ["C", true],
          // -C <commit>  reuse message
          ["F", true],
          // -F <file>    read message from file
          ["c", true],
          // -c <commit>  reedit message
          ["m", true],
          // -m <msg>
          ["t", true]
          // -t <template>
        ]),
        long: /* @__PURE__ */ new Set(["file", "message", "reedit-message", "reuse-message", "template"])
      },
      config: {
        short: /* @__PURE__ */ new Map([
          ["e", false],
          // -e  open editor
          ["f", true],
          //  -f <file>
          ["l", false]
          // -l  list
        ]),
        long: /* @__PURE__ */ new Set(["blob", "comment", "default", "file", "type", "value"])
      },
      fetch: {
        short: /* @__PURE__ */ new Map(),
        long: /* @__PURE__ */ new Set(["upload-pack"])
      },
      init: {
        short: /* @__PURE__ */ new Map(),
        long: /* @__PURE__ */ new Set(["template"])
      },
      pull: {
        short: /* @__PURE__ */ new Map(),
        long: /* @__PURE__ */ new Set(["upload-pack"])
      },
      push: {
        short: /* @__PURE__ */ new Map(),
        long: /* @__PURE__ */ new Set(["exec", "receive-pack"])
      }
    };
    T = { short: /* @__PURE__ */ new Map(), long: /* @__PURE__ */ new Set() };
    q = [
      c2("alias", "allowUnsafeAlias"),
      c2("core.askPass", "allowUnsafeAskPass"),
      c2("core.editor", "allowUnsafeEditor"),
      c2("core.fsmonitor", "allowUnsafeFsMonitor"),
      c2("core.gitProxy", "allowUnsafeGitProxy"),
      c2("core.hooksPath", "allowUnsafeHooksPath"),
      c2("core.pager", "allowUnsafePager"),
      c2("core.sshCommand", "allowUnsafeSshCommand"),
      i("credential.helper", "allowUnsafeCredentialHelper"),
      i("diff.command", "allowUnsafeDiffExternal"),
      c2("diff.external", "allowUnsafeDiffExternal"),
      i("diff.textconv", "allowUnsafeDiffTextConv"),
      i("filter.clean", "allowUnsafeFilter"),
      i("filter.smudge", "allowUnsafeFilter"),
      i("gpg.program", "allowUnsafeGpgProgram"),
      c2("init.templateDir", "allowUnsafeTemplateDir"),
      i("merge.driver", "allowUnsafeMergeDriver"),
      i("mergetool.path", "allowUnsafeMergeDriver"),
      i("mergetool.cmd", "allowUnsafeMergeDriver"),
      i("protocol.allow", "allowUnsafeProtocolOverride"),
      i("remote.receivepack", "allowUnsafePack"),
      i("remote.uploadpack", "allowUnsafePack"),
      c2("sequence.editor", "allowUnsafeEditor")
    ];
    H = [
      h(
        null,
        /--(upload|receive)-pack/,
        "allowUnsafePack",
        "--upload-pack or --receive-pack"
      ),
      h("clone", /^-\w*u/, "allowUnsafePack"),
      h("clone", "--u", "allowUnsafePack"),
      h("push", "--exec", "allowUnsafePack"),
      h(null, "--template", "allowUnsafeTemplateDir")
    ];
    y = {
      editor: "allowUnsafeEditor",
      git_askpass: "allowUnsafeAskPass",
      git_config_global: "allowUnsafeConfigPaths",
      git_config_system: "allowUnsafeConfigPaths",
      git_config_count: "allowUnsafeConfigEnvCount",
      git_config: "allowUnsafeConfigPaths",
      git_editor: "allowUnsafeEditor",
      git_exec_path: "allowUnsafeConfigPaths",
      git_external_diff: "allowUnsafeDiffExternal",
      git_pager: "allowUnsafePager",
      git_proxy_command: "allowUnsafeGitProxy",
      git_template_dir: "allowUnsafeTemplateDir",
      git_sequence_editor: "allowUnsafeEditor",
      git_ssh: "allowUnsafeSshCommand",
      git_ssh_command: "allowUnsafeSshCommand",
      pager: "allowUnsafePager",
      prefix: "allowUnsafeConfigPaths",
      ssh_askpass: "allowUnsafeAskPass"
    };
  }
});

// node_modules/simple-git/dist/esm/index.js
import { spawn } from "child_process";
import { normalize } from "node:path";
import { EventEmitter } from "node:events";
function asFunction(source) {
  if (typeof source !== "function") {
    return NOOP;
  }
  return source;
}
function isUserFunction(source) {
  return typeof source === "function" && source !== NOOP;
}
function splitOn(input, char) {
  const index = input.indexOf(char);
  if (index <= 0) {
    return [input, ""];
  }
  return [input.substr(0, index), input.substr(index + 1)];
}
function first(input, offset = 0) {
  return isArrayLike(input) && input.length > offset ? input[offset] : void 0;
}
function last(input, offset = 0) {
  if (isArrayLike(input) && input.length > offset) {
    return input[input.length - 1 - offset];
  }
}
function isArrayLike(input) {
  return filterHasLength(input);
}
function toLinesWithContent(input = "", trimmed2 = true, separator = "\n") {
  return input.split(separator).reduce((output, line) => {
    const lineContent = trimmed2 ? line.trim() : line;
    if (lineContent) {
      output.push(lineContent);
    }
    return output;
  }, []);
}
function forEachLineWithContent(input, callback) {
  return toLinesWithContent(input, true).map((line) => callback(line));
}
function folderExists(path) {
  return (0, import_file_exists.exists)(path, import_file_exists.FOLDER);
}
function append(target, item) {
  if (Array.isArray(target)) {
    if (!target.includes(item)) {
      target.push(item);
    }
  } else {
    target.add(item);
  }
  return item;
}
function including(target, item) {
  if (Array.isArray(target) && !target.includes(item)) {
    target.push(item);
  }
  return target;
}
function remove(target, item) {
  if (Array.isArray(target)) {
    const index = target.indexOf(item);
    if (index >= 0) {
      target.splice(index, 1);
    }
  } else {
    target.delete(item);
  }
  return item;
}
function asArray(source) {
  return Array.isArray(source) ? source : [source];
}
function asCamelCase(str2) {
  return str2.replace(/[\s-]+(.)/g, (_all, chr) => {
    return chr.toUpperCase();
  });
}
function asStringArray(source) {
  return asArray(source).map((item) => {
    return item instanceof String ? item : String(item);
  });
}
function asNumber(source, onNaN = 0) {
  if (source == null) {
    return onNaN;
  }
  const num3 = parseInt(source, 10);
  return Number.isNaN(num3) ? onNaN : num3;
}
function prefixedArray(input, prefix) {
  const output = [];
  for (let i2 = 0, max = input.length; i2 < max; i2++) {
    output.push(prefix, input[i2]);
  }
  return output;
}
function bufferToString(input) {
  return (Array.isArray(input) ? Buffer.concat(input) : input).toString("utf-8");
}
function pick(source, properties) {
  const out = {};
  properties.forEach((key) => {
    if (source[key] !== void 0) {
      out[key] = source[key];
    }
  });
  return out;
}
function delay(duration = 0) {
  return new Promise((done) => setTimeout(done, duration));
}
function orVoid(input) {
  if (input === false) {
    return void 0;
  }
  return input;
}
function filterType(input, filter, def) {
  if (filter(input)) {
    return input;
  }
  return arguments.length > 2 ? def : void 0;
}
function filterPrimitives(input, omit) {
  const type = r(input) ? "string" : typeof input;
  return /number|string|boolean/.test(type) && (!omit || !omit.includes(type));
}
function filterPlainObject(input) {
  return !!input && objectToString(input) === "[object Object]";
}
function filterFunction(input) {
  return typeof input === "function";
}
function useMatchesDefault() {
  throw new Error(`LineParser:useMatches not implemented`);
}
function createInstanceConfig(...options) {
  const baseDir = process.cwd();
  const config = Object.assign(
    { baseDir, ...defaultOptions },
    ...options.filter((o2) => typeof o2 === "object" && o2)
  );
  config.baseDir = config.baseDir || baseDir;
  config.trimmed = config.trimmed === true;
  return config;
}
function appendTaskOptions(options, commands = []) {
  if (!filterPlainObject(options)) {
    return commands;
  }
  return Object.keys(options).reduce((commands2, key) => {
    const value = options[key];
    if (r(value)) {
      commands2.push(value);
    } else if (filterPrimitives(value, ["boolean"])) {
      commands2.push(key + "=" + value);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        if (!filterPrimitives(v, ["string", "number"])) {
          commands2.push(key + "=" + v);
        }
      }
    } else {
      commands2.push(key);
    }
    return commands2;
  }, commands);
}
function getTrailingOptions(args, initialPrimitive = 0, objectOnly = false) {
  const command = [];
  for (let i2 = 0, max = initialPrimitive < 0 ? args.length : initialPrimitive; i2 < max; i2++) {
    if ("string|number".includes(typeof args[i2])) {
      command.push(String(args[i2]));
    }
  }
  appendTaskOptions(trailingOptionsArgument(args), command);
  if (!objectOnly) {
    command.push(...trailingArrayArgument(args));
  }
  return command;
}
function trailingArrayArgument(args) {
  const hasTrailingCallback = typeof last(args) === "function";
  return asStringArray(filterType(last(args, hasTrailingCallback ? 1 : 0), filterArray, []));
}
function trailingOptionsArgument(args) {
  const hasTrailingCallback = filterFunction(last(args));
  return filterType(last(args, hasTrailingCallback ? 1 : 0), filterPlainObject);
}
function trailingFunctionArgument(args, includeNoop = true) {
  const callback = asFunction(last(args));
  return includeNoop || isUserFunction(callback) ? callback : void 0;
}
function callTaskParser(parser4, streams) {
  return parser4(streams.stdOut, streams.stdErr);
}
function parseStringResponse(result, parsers12, texts, trim = true) {
  asArray(texts).forEach((text) => {
    for (let lines = toLinesWithContent(text, trim), i2 = 0, max = lines.length; i2 < max; i2++) {
      const line = (offset = 0) => {
        if (i2 + offset >= max) {
          return;
        }
        return lines[i2 + offset];
      };
      parsers12.some(({ parse }) => parse(line, result));
    }
  });
  return result;
}
function checkIsRepoTask(action) {
  switch (action) {
    case "bare":
      return checkIsBareRepoTask();
    case "root":
      return checkIsRepoRootTask();
  }
  const commands = ["rev-parse", "--is-inside-work-tree"];
  return {
    commands,
    format: "utf-8",
    onError,
    parser
  };
}
function checkIsRepoRootTask() {
  const commands = ["rev-parse", "--git-dir"];
  return {
    commands,
    format: "utf-8",
    onError,
    parser(path) {
      return /^\.(git)?$/.test(path.trim());
    }
  };
}
function checkIsBareRepoTask() {
  const commands = ["rev-parse", "--is-bare-repository"];
  return {
    commands,
    format: "utf-8",
    onError,
    parser
  };
}
function isNotRepoMessage(error) {
  return /(Not a git repository|Kein Git-Repository)/i.test(String(error));
}
function cleanSummaryParser(dryRun, text) {
  const summary = new CleanResponse(dryRun);
  const regexp = dryRun ? dryRunRemovalRegexp : removalRegexp;
  toLinesWithContent(text).forEach((line) => {
    const removed = line.replace(regexp, "");
    summary.paths.push(removed);
    (isFolderRegexp.test(removed) ? summary.folders : summary.files).push(removed);
  });
  return summary;
}
function adhocExecTask(parser4) {
  return {
    commands: EMPTY_COMMANDS,
    format: "empty",
    parser: parser4
  };
}
function configurationErrorTask(error) {
  return {
    commands: EMPTY_COMMANDS,
    format: "empty",
    parser() {
      throw typeof error === "string" ? new TaskConfigurationError(error) : error;
    }
  };
}
function straightThroughStringTask(commands, trimmed2 = false) {
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return trimmed2 ? String(text).trim() : text;
    }
  };
}
function straightThroughBufferTask(commands) {
  return {
    commands,
    format: "buffer",
    parser(buffer) {
      return buffer;
    }
  };
}
function isBufferTask(task) {
  return task.format === "buffer";
}
function isEmptyTask(task) {
  return task.format === "empty" || !task.commands.length;
}
function cleanWithOptionsTask(mode, customArgs) {
  const { cleanMode, options, valid } = getCleanOptions(mode);
  if (!cleanMode) {
    return configurationErrorTask(CONFIG_ERROR_MODE_REQUIRED);
  }
  if (!valid.options) {
    return configurationErrorTask(CONFIG_ERROR_UNKNOWN_OPTION + JSON.stringify(mode));
  }
  options.push(...customArgs);
  if (options.some(isInteractiveMode)) {
    return configurationErrorTask(CONFIG_ERROR_INTERACTIVE_MODE);
  }
  return cleanTask(cleanMode, options);
}
function cleanTask(mode, customArgs) {
  const commands = ["clean", `-${mode}`, ...customArgs];
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return cleanSummaryParser(mode === "n", text);
    }
  };
}
function isCleanOptionsArray(input) {
  return Array.isArray(input) && input.every((test) => CleanOptionValues.has(test));
}
function getCleanOptions(input) {
  let cleanMode;
  let options = [];
  let valid = { cleanMode: false, options: true };
  input.replace(/[^a-z]i/g, "").split("").forEach((char) => {
    if (isCleanMode(char)) {
      cleanMode = char;
      valid.cleanMode = true;
    } else {
      valid.options = valid.options && isKnownOption(options[options.length] = `-${char}`);
    }
  });
  return {
    cleanMode,
    options,
    valid
  };
}
function isCleanMode(cleanMode) {
  return cleanMode === "f" || cleanMode === "n";
}
function isKnownOption(option) {
  return /^-[a-z]$/i.test(option) && CleanOptionValues.has(option.charAt(1));
}
function isInteractiveMode(option) {
  if (/^-[^\-]/.test(option)) {
    return option.indexOf("i") > 0;
  }
  return option === "--interactive";
}
function configListParser(text) {
  const config = new ConfigList();
  for (const item of configParser(text)) {
    config.addValue(item.file, String(item.key), item.value);
  }
  return config;
}
function configGetParser(text, key) {
  let value = null;
  const values = [];
  const scopes = /* @__PURE__ */ new Map();
  for (const item of configParser(text, key)) {
    if (item.key !== key) {
      continue;
    }
    values.push(value = item.value);
    if (!scopes.has(item.file)) {
      scopes.set(item.file, []);
    }
    scopes.get(item.file).push(value);
  }
  return {
    key,
    paths: Array.from(scopes.keys()),
    scopes,
    value,
    values
  };
}
function configFilePath(filePath) {
  return filePath.replace(/^(file):/, "");
}
function* configParser(text, requestedKey = null) {
  const lines = text.split("\0");
  for (let i2 = 0, max = lines.length - 1; i2 < max; ) {
    const file = configFilePath(lines[i2++]);
    let value = lines[i2++];
    let key = requestedKey;
    if (value.includes("\n")) {
      const line = splitOn(value, "\n");
      key = line[0];
      value = line[1];
    }
    yield { file, key, value };
  }
}
function asConfigScope(scope, fallback) {
  if (typeof scope === "string" && Object.hasOwn(GitConfigScope, scope)) {
    return scope;
  }
  return fallback;
}
function addConfigTask(key, value, append2, scope) {
  const commands = ["config", `--${scope}`];
  if (append2) {
    commands.push("--add");
  }
  commands.push(key, value);
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return text;
    }
  };
}
function getConfigTask(key, scope) {
  const commands = ["config", "--null", "--show-origin", "--get-all", key];
  if (scope) {
    commands.splice(1, 0, `--${scope}`);
  }
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return configGetParser(text, key);
    }
  };
}
function listConfigTask(scope) {
  const commands = ["config", "--list", "--show-origin", "--null"];
  if (scope) {
    commands.push(`--${scope}`);
  }
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return configListParser(text);
    }
  };
}
function config_default() {
  return {
    addConfig(key, value, ...rest) {
      return this._runTask(
        addConfigTask(
          key,
          value,
          rest[0] === true,
          asConfigScope(
            rest[1],
            "local"
            /* local */
          )
        ),
        trailingFunctionArgument(arguments)
      );
    },
    getConfig(key, scope) {
      return this._runTask(
        getConfigTask(key, asConfigScope(scope, void 0)),
        trailingFunctionArgument(arguments)
      );
    },
    listConfig(...rest) {
      return this._runTask(
        listConfigTask(asConfigScope(rest[0], void 0)),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
function isDiffNameStatus(input) {
  return diffNameStatus.has(input);
}
function grepQueryBuilder(...params) {
  return new GrepQuery().param(...params);
}
function parseGrep(grep) {
  const paths = /* @__PURE__ */ new Set();
  const results = {};
  forEachLineWithContent(grep, (input) => {
    const [path, line, preview] = input.split(NULL);
    paths.add(path);
    (results[path] = results[path] || []).push({
      line: asNumber(line),
      path,
      preview
    });
  });
  return {
    paths,
    results
  };
}
function grep_default() {
  return {
    grep(searchTerm) {
      const then = trailingFunctionArgument(arguments);
      const options = getTrailingOptions(arguments);
      for (const option of disallowedOptions) {
        if (options.includes(option)) {
          return this._runTask(
            configurationErrorTask(`git.grep: use of "${option}" is not supported.`),
            then
          );
        }
      }
      if (typeof searchTerm === "string") {
        searchTerm = grepQueryBuilder().param(searchTerm);
      }
      const commands = ["grep", "--null", "-n", "--full-name", ...options, ...searchTerm];
      return this._runTask(
        {
          commands,
          format: "utf-8",
          parser(stdOut) {
            return parseGrep(stdOut);
          }
        },
        then
      );
    }
  };
}
function resetTask(mode, customArgs) {
  const commands = ["reset"];
  if (isValidResetMode(mode)) {
    commands.push(`--${mode}`);
  }
  commands.push(...customArgs);
  return straightThroughStringTask(commands);
}
function getResetMode(mode) {
  if (isValidResetMode(mode)) {
    return mode;
  }
  switch (typeof mode) {
    case "string":
    case "undefined":
      return "soft";
  }
  return;
}
function isValidResetMode(mode) {
  return typeof mode === "string" && validResetModes.includes(mode);
}
function createLog() {
  return (0, import_debug.default)("simple-git");
}
function prefixedLogger(to, prefix, forward) {
  if (!prefix || !String(prefix).replace(/\s*/, "")) {
    return !forward ? to : (message, ...args) => {
      to(message, ...args);
      forward(message, ...args);
    };
  }
  return (message, ...args) => {
    to(`%s ${message}`, prefix, ...args);
    if (forward) {
      forward(message, ...args);
    }
  };
}
function childLoggerName(name, childDebugger, { namespace: parentNamespace }) {
  if (typeof name === "string") {
    return name;
  }
  const childNamespace = childDebugger && childDebugger.namespace || "";
  if (childNamespace.startsWith(parentNamespace)) {
    return childNamespace.substr(parentNamespace.length + 1);
  }
  return childNamespace || parentNamespace;
}
function createLogger(label, verbose, initialStep, infoDebugger = createLog()) {
  const labelPrefix = label && `[${label}]` || "";
  const spawned = [];
  const debugDebugger = typeof verbose === "string" ? infoDebugger.extend(verbose) : verbose;
  const key = childLoggerName(filterType(verbose, filterString), debugDebugger, infoDebugger);
  return step(initialStep);
  function sibling(name, initial) {
    return append(
      spawned,
      createLogger(label, key.replace(/^[^:]+/, name), initial, infoDebugger)
    );
  }
  function step(phase) {
    const stepPrefix = phase && `[${phase}]` || "";
    const debug2 = debugDebugger && prefixedLogger(debugDebugger, stepPrefix) || NOOP;
    const info = prefixedLogger(infoDebugger, `${labelPrefix} ${stepPrefix}`, debug2);
    return Object.assign(debugDebugger ? debug2 : info, {
      label,
      sibling,
      info,
      step
    });
  }
}
function pluginContext(task, commands) {
  return {
    method: first(task.commands) || "",
    commands
  };
}
function onErrorReceived(target, logger) {
  return (err) => {
    logger(`[ERROR] child process exception %o`, err);
    target.push(Buffer.from(String(err.stack), "ascii"));
  };
}
function onDataReceived(target, name, logger, output) {
  return (buffer) => {
    logger(`%s received %L bytes`, name, buffer);
    output(`%B`, buffer);
    target.push(buffer);
  };
}
function taskCallback(task, response, callback = NOOP) {
  const onSuccess = (data) => {
    callback(null, data);
  };
  const onError2 = (err) => {
    if (err?.task === task) {
      callback(
        err instanceof GitResponseError ? addDeprecationNoticeToError(err) : err,
        void 0
      );
    }
  };
  response.then(onSuccess, onError2);
}
function addDeprecationNoticeToError(err) {
  let log = (name) => {
    console.warn(
      `simple-git deprecation notice: accessing GitResponseError.${name} should be GitResponseError.git.${name}, this will no longer be available in version 3`
    );
    log = NOOP;
  };
  return Object.create(err, Object.getOwnPropertyNames(err.git).reduce(descriptorReducer, {}));
  function descriptorReducer(all, name) {
    if (name in err) {
      return all;
    }
    all[name] = {
      enumerable: false,
      configurable: false,
      get() {
        log(name);
        return err.git[name];
      }
    };
    return all;
  }
}
function changeWorkingDirectoryTask(directory, root) {
  return adhocExecTask((instance) => {
    if (!folderExists(directory)) {
      throw new Error(`Git.cwd: cannot change to non-directory "${directory}"`);
    }
    return (root || instance).cwd = directory;
  });
}
function checkoutTask(args) {
  const commands = ["checkout", ...args];
  if (commands[1] === "-b" && commands.includes("-B")) {
    commands[1] = remove(commands, "-B");
  }
  return straightThroughStringTask(commands);
}
function checkout_default() {
  return {
    checkout() {
      return this._runTask(
        checkoutTask(getTrailingOptions(arguments, 1)),
        trailingFunctionArgument(arguments)
      );
    },
    checkoutBranch(branchName, startPoint) {
      return this._runTask(
        checkoutTask(["-b", branchName, startPoint, ...getTrailingOptions(arguments)]),
        trailingFunctionArgument(arguments)
      );
    },
    checkoutLocalBranch(branchName) {
      return this._runTask(
        checkoutTask(["-b", branchName, ...getTrailingOptions(arguments)]),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
function countObjectsResponse() {
  return {
    count: 0,
    garbage: 0,
    inPack: 0,
    packs: 0,
    prunePackable: 0,
    size: 0,
    sizeGarbage: 0,
    sizePack: 0
  };
}
function count_objects_default() {
  return {
    countObjects() {
      return this._runTask({
        commands: ["count-objects", "--verbose"],
        format: "utf-8",
        parser(stdOut) {
          return parseStringResponse(countObjectsResponse(), [parser2], stdOut);
        }
      });
    }
  };
}
function parseCommitResult(stdOut) {
  const result = {
    author: null,
    branch: "",
    commit: "",
    root: false,
    summary: {
      changes: 0,
      insertions: 0,
      deletions: 0
    }
  };
  return parseStringResponse(result, parsers, stdOut);
}
function commitTask(message, files, customArgs) {
  const commands = [
    "-c",
    "core.abbrev=40",
    "commit",
    ...prefixedArray(message, "-m"),
    ...files,
    ...customArgs
  ];
  return {
    commands,
    format: "utf-8",
    parser: parseCommitResult
  };
}
function commit_default() {
  return {
    commit(message, ...rest) {
      const next = trailingFunctionArgument(arguments);
      const task = rejectDeprecatedSignatures(message) || commitTask(
        asArray(message),
        asArray(filterType(rest[0], filterStringOrStringArray, [])),
        [
          ...asStringArray(filterType(rest[1], filterArray, [])),
          ...getTrailingOptions(arguments, 0, true)
        ]
      );
      return this._runTask(task, next);
    }
  };
  function rejectDeprecatedSignatures(message) {
    return !filterStringOrStringArray(message) && configurationErrorTask(
      `git.commit: requires the commit message to be supplied as a string/string[]`
    );
  }
}
function first_commit_default() {
  return {
    firstCommit() {
      return this._runTask(
        straightThroughStringTask(["rev-list", "--max-parents=0", "HEAD"], true),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
function hashObjectTask(filePath, write) {
  const commands = ["hash-object", filePath];
  if (write) {
    commands.push("-w");
  }
  return straightThroughStringTask(commands, true);
}
function parseInit(bare, path, text) {
  const response = String(text).trim();
  let result;
  if (result = initResponseRegex.exec(response)) {
    return new InitSummary(bare, path, false, result[1]);
  }
  if (result = reInitResponseRegex.exec(response)) {
    return new InitSummary(bare, path, true, result[1]);
  }
  let gitDir = "";
  const tokens = response.split(" ");
  while (tokens.length) {
    const token = tokens.shift();
    if (token === "in") {
      gitDir = tokens.join(" ");
      break;
    }
  }
  return new InitSummary(bare, path, /^re/i.test(response), gitDir);
}
function hasBareCommand(command) {
  return command.includes(bareCommand);
}
function initTask(bare = false, path, customArgs) {
  const commands = ["init", ...customArgs];
  if (bare && !hasBareCommand(commands)) {
    commands.splice(1, 0, bareCommand);
  }
  return {
    commands,
    format: "utf-8",
    parser(text) {
      return parseInit(commands.includes("--bare"), path, text);
    }
  };
}
function logFormatFromCommand(customArgs) {
  for (let i2 = 0; i2 < customArgs.length; i2++) {
    const format = logFormatRegex.exec(customArgs[i2]);
    if (format) {
      return `--${format[1]}`;
    }
  }
  return "";
}
function isLogFormat(customArg) {
  return logFormatRegex.test(customArg);
}
function getDiffParser(format = "") {
  const parser4 = diffSummaryParsers[format];
  return (stdOut) => parseStringResponse(new DiffSummary(), parser4, stdOut, false);
}
function lineBuilder(tokens, fields) {
  return fields.reduce(
    (line, field, index) => {
      line[field] = tokens[index] || "";
      return line;
    },
    /* @__PURE__ */ Object.create({ diff: null })
  );
}
function createListLogSummaryParser(splitter = SPLITTER, fields = defaultFieldNames, logFormat = "") {
  const parseDiffResult = getDiffParser(logFormat);
  return function(stdOut) {
    const all = toLinesWithContent(
      stdOut.trim(),
      false,
      START_BOUNDARY
    ).map(function(item) {
      const lineDetail = item.split(COMMIT_BOUNDARY);
      const listLogLine = lineBuilder(lineDetail[0].split(splitter), fields);
      if (lineDetail.length > 1 && !!lineDetail[1].trim()) {
        listLogLine.diff = parseDiffResult(lineDetail[1]);
      }
      return listLogLine;
    });
    return {
      all,
      latest: all.length && all[0] || null,
      total: all.length
    };
  };
}
function diffSummaryTask(customArgs) {
  let logFormat = logFormatFromCommand(customArgs);
  const commands = ["diff"];
  if (logFormat === "") {
    logFormat = "--stat";
    commands.push("--stat=4096");
  }
  commands.push(...customArgs);
  return validateLogFormatConfig(commands) || {
    commands,
    format: "utf-8",
    parser: getDiffParser(logFormat)
  };
}
function validateLogFormatConfig(customArgs) {
  const flags = customArgs.filter(isLogFormat);
  if (flags.length > 1) {
    return configurationErrorTask(
      `Summary flags are mutually exclusive - pick one of ${flags.join(",")}`
    );
  }
  if (flags.length && customArgs.includes("-z")) {
    return configurationErrorTask(
      `Summary flag ${flags} parsing is not compatible with null termination option '-z'`
    );
  }
}
function prettyFormat(format, splitter) {
  const fields = [];
  const formatStr = [];
  Object.keys(format).forEach((field) => {
    fields.push(field);
    formatStr.push(String(format[field]));
  });
  return [fields, formatStr.join(splitter)];
}
function userOptions(input) {
  return Object.keys(input).reduce((out, key) => {
    if (!(key in excludeOptions)) {
      out[key] = input[key];
    }
    return out;
  }, {});
}
function parseLogOptions(opt = {}, customArgs = []) {
  const splitter = filterType(opt.splitter, filterString, SPLITTER);
  const format = filterPlainObject(opt.format) ? opt.format : {
    hash: "%H",
    date: opt.strictDate === false ? "%ai" : "%aI",
    message: "%s",
    refs: "%D",
    body: opt.multiLine ? "%B" : "%b",
    author_name: opt.mailMap !== false ? "%aN" : "%an",
    author_email: opt.mailMap !== false ? "%aE" : "%ae"
  };
  const [fields, formatStr] = prettyFormat(format, splitter);
  const suffix = [];
  const command = [
    `--pretty=format:${START_BOUNDARY}${formatStr}${COMMIT_BOUNDARY}`,
    ...customArgs
  ];
  const maxCount = opt.n || opt["max-count"] || opt.maxCount;
  if (maxCount) {
    command.push(`--max-count=${maxCount}`);
  }
  if (opt.from || opt.to) {
    const rangeOperator = opt.symmetric !== false ? "..." : "..";
    suffix.push(`${opt.from || ""}${rangeOperator}${opt.to || ""}`);
  }
  if (filterString(opt.file)) {
    command.push("--follow", c(opt.file));
  }
  appendTaskOptions(userOptions(opt), command);
  return {
    fields,
    splitter,
    commands: [...command, ...suffix]
  };
}
function logTask(splitter, fields, customArgs) {
  const parser4 = createListLogSummaryParser(splitter, fields, logFormatFromCommand(customArgs));
  return {
    commands: ["log", ...customArgs],
    format: "utf-8",
    parser: parser4
  };
}
function log_default() {
  return {
    log(...rest) {
      const next = trailingFunctionArgument(arguments);
      const options = parseLogOptions(
        trailingOptionsArgument(arguments),
        asStringArray(filterType(arguments[0], filterArray, []))
      );
      const task = rejectDeprecatedSignatures(...rest) || validateLogFormatConfig(options.commands) || createLogTask(options);
      return this._runTask(task, next);
    }
  };
  function createLogTask(options) {
    return logTask(options.splitter, options.fields, options.commands);
  }
  function rejectDeprecatedSignatures(from, to) {
    return filterString(from) && filterString(to) && configurationErrorTask(
      `git.log(string, string) should be replaced with git.log({ from: string, to: string })`
    );
  }
}
function objectEnumerationResult(remoteMessages) {
  return remoteMessages.objects = remoteMessages.objects || {
    compressing: 0,
    counting: 0,
    enumerating: 0,
    packReused: 0,
    reused: { count: 0, delta: 0 },
    total: { count: 0, delta: 0 }
  };
}
function asObjectCount(source) {
  const count = /^\s*(\d+)/.exec(source);
  const delta = /delta (\d+)/i.exec(source);
  return {
    count: asNumber(count && count[1] || "0"),
    delta: asNumber(delta && delta[1] || "0")
  };
}
function parseRemoteMessages(_stdOut, stdErr) {
  return parseStringResponse({ remoteMessages: new RemoteMessageSummary() }, parsers2, stdErr);
}
function parsePullErrorResult(stdOut, stdErr) {
  const pullError = parseStringResponse(new PullFailedSummary(), errorParsers, [stdOut, stdErr]);
  return pullError.message && pullError;
}
function mergeTask(customArgs) {
  if (!customArgs.length) {
    return configurationErrorTask("Git.merge requires at least one option");
  }
  return {
    commands: ["merge", ...customArgs],
    format: "utf-8",
    parser(stdOut, stdErr) {
      const merge = parseMergeResult(stdOut, stdErr);
      if (merge.failed) {
        throw new GitResponseError(merge);
      }
      return merge;
    }
  };
}
function pushResultPushedItem(local, remote, status) {
  const deleted = status.includes("deleted");
  const tag = status.includes("tag") || /^refs\/tags/.test(local);
  const alreadyUpdated = !status.includes("new");
  return {
    deleted,
    tag,
    branch: !tag,
    new: !alreadyUpdated,
    alreadyUpdated,
    local,
    remote
  };
}
function pushTagsTask(ref = {}, customArgs) {
  append(customArgs, "--tags");
  return pushTask(ref, customArgs);
}
function pushTask(ref = {}, customArgs) {
  const commands = ["push", ...customArgs];
  if (ref.branch) {
    commands.splice(1, 0, ref.branch);
  }
  if (ref.remote) {
    commands.splice(1, 0, ref.remote);
  }
  remove(commands, "-v");
  append(commands, "--verbose");
  append(commands, "--porcelain");
  return {
    commands,
    format: "utf-8",
    parser: parsePushResult
  };
}
function show_default() {
  return {
    showBuffer() {
      const commands = ["show", ...getTrailingOptions(arguments, 1)];
      if (!commands.includes("--binary")) {
        commands.splice(1, 0, "--binary");
      }
      return this._runTask(
        straightThroughBufferTask(commands),
        trailingFunctionArgument(arguments)
      );
    },
    show() {
      const commands = ["show", ...getTrailingOptions(arguments, 1)];
      return this._runTask(
        straightThroughStringTask(commands),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
function renamedFile(line) {
  const [to, from] = line.split(NULL);
  return {
    from: from || to,
    to
  };
}
function parser3(indexX, indexY, handler) {
  return [`${indexX}${indexY}`, handler];
}
function conflicts(indexX, ...indexY) {
  return indexY.map((y2) => parser3(indexX, y2, (result, file) => result.conflicted.push(file)));
}
function splitLine(result, lineStr) {
  const trimmed2 = lineStr.trim();
  switch (" ") {
    case trimmed2.charAt(2):
      return data(trimmed2.charAt(0), trimmed2.charAt(1), trimmed2.slice(3));
    case trimmed2.charAt(1):
      return data(" ", trimmed2.charAt(0), trimmed2.slice(2));
    default:
      return;
  }
  function data(index, workingDir, path) {
    const raw = `${index}${workingDir}`;
    const handler = parsers6.get(raw);
    if (handler) {
      handler(result, path);
    }
    if (raw !== "##" && raw !== "!!") {
      result.files.push(new FileStatusSummary(path, index, workingDir));
    }
  }
}
function statusTask(customArgs) {
  const commands = [
    "status",
    "--porcelain",
    "-b",
    "-u",
    "--null",
    ...customArgs.filter((arg) => !ignoredOptions.includes(arg))
  ];
  return {
    format: "utf-8",
    commands,
    parser(text) {
      return parseStatusSummary(text);
    }
  };
}
function versionResponse(major = 0, minor = 0, patch = 0, agent = "", installed = true) {
  return Object.defineProperty(
    {
      major,
      minor,
      patch,
      agent,
      installed
    },
    "toString",
    {
      value() {
        return `${this.major}.${this.minor}.${this.patch}`;
      },
      configurable: false,
      enumerable: false
    }
  );
}
function notInstalledResponse() {
  return versionResponse(0, 0, 0, "", false);
}
function version_default() {
  return {
    version() {
      return this._runTask({
        commands: ["--version"],
        format: "utf-8",
        parser: versionParser,
        onError(result, error, done, fail) {
          if (result.exitCode === -2) {
            return done(Buffer.from(NOT_INSTALLED));
          }
          fail(error);
        }
      });
    }
  };
}
function versionParser(stdOut) {
  if (stdOut === NOT_INSTALLED) {
    return notInstalledResponse();
  }
  return parseStringResponse(versionResponse(0, 0, 0, stdOut), parsers7, stdOut);
}
function createCloneTask(api, task, repoPath, ...args) {
  if (!filterString(repoPath)) {
    return configurationErrorTask(`git.${api}() requires a string 'repoPath'`);
  }
  return task(repoPath, filterType(args[0], filterString), getTrailingOptions(arguments));
}
function clone_default() {
  return {
    clone(repo, ...rest) {
      return this._runTask(
        createCloneTask("clone", cloneTask, filterType(repo, filterString), ...rest),
        trailingFunctionArgument(arguments)
      );
    },
    mirror(repo, ...rest) {
      return this._runTask(
        createCloneTask("mirror", cloneMirrorTask, filterType(repo, filterString), ...rest),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
function applyPatchTask(patches, customArgs) {
  return straightThroughStringTask(["apply", ...customArgs, ...patches]);
}
function branchDeletionSuccess(branch, hash) {
  return {
    branch,
    hash,
    success: true
  };
}
function branchDeletionFailure(branch) {
  return {
    branch,
    hash: null,
    success: false
  };
}
function hasBranchDeletionError(data, processExitCode) {
  return processExitCode === 1 && deleteErrorRegex.test(data);
}
function branchStatus(input) {
  return input ? input.charAt(0) : "";
}
function parseBranchSummary(stdOut, currentOnly = false) {
  return parseStringResponse(
    new BranchSummaryResult(),
    currentOnly ? [currentBranchParser] : parsers9,
    stdOut
  );
}
function containsDeleteBranchCommand(commands) {
  const deleteCommands = ["-d", "-D", "--delete"];
  return commands.some((command) => deleteCommands.includes(command));
}
function branchTask(customArgs) {
  const isDelete = containsDeleteBranchCommand(customArgs);
  const isCurrentOnly = customArgs.includes("--show-current");
  const commands = ["branch", ...customArgs];
  if (commands.length === 1) {
    commands.push("-a");
  }
  if (!commands.includes("-v")) {
    commands.splice(1, 0, "-v");
  }
  return {
    format: "utf-8",
    commands,
    parser(stdOut, stdErr) {
      if (isDelete) {
        return parseBranchDeletions(stdOut, stdErr).all[0];
      }
      return parseBranchSummary(stdOut, isCurrentOnly);
    }
  };
}
function branchLocalTask() {
  return {
    format: "utf-8",
    commands: ["branch", "-v"],
    parser(stdOut) {
      return parseBranchSummary(stdOut);
    }
  };
}
function deleteBranchesTask(branches, forceDelete = false) {
  return {
    format: "utf-8",
    commands: ["branch", "-v", forceDelete ? "-D" : "-d", ...branches],
    parser(stdOut, stdErr) {
      return parseBranchDeletions(stdOut, stdErr);
    },
    onError({ exitCode, stdOut }, error, done, fail) {
      if (!hasBranchDeletionError(String(error), exitCode)) {
        return fail(error);
      }
      done(stdOut);
    }
  };
}
function deleteBranchTask(branch, forceDelete = false) {
  const task = {
    format: "utf-8",
    commands: ["branch", "-v", forceDelete ? "-D" : "-d", branch],
    parser(stdOut, stdErr) {
      return parseBranchDeletions(stdOut, stdErr).branches[branch];
    },
    onError({ exitCode, stdErr, stdOut }, error, _2, fail) {
      if (!hasBranchDeletionError(String(error), exitCode)) {
        return fail(error);
      }
      throw new GitResponseError(
        task.parser(bufferToString(stdOut), bufferToString(stdErr)),
        String(error)
      );
    }
  };
  return task;
}
function toPath(input) {
  const path = input.trim().replace(/^["']|["']$/g, "");
  return path && normalize(path);
}
function checkIgnoreTask(paths) {
  return {
    commands: ["check-ignore", ...paths],
    format: "utf-8",
    parser: parseCheckIgnore
  };
}
function parseFetchResult(stdOut, stdErr) {
  const result = {
    raw: stdOut,
    remote: null,
    branches: [],
    tags: [],
    updated: [],
    deleted: []
  };
  return parseStringResponse(result, parsers10, [stdOut, stdErr]);
}
function disallowedCommand(command) {
  return /^--upload-pack(=|$)/.test(command);
}
function fetchTask(remote, branch, customArgs) {
  const commands = ["fetch", ...customArgs];
  if (remote && branch) {
    commands.push(remote, branch);
  }
  const banned = commands.find(disallowedCommand);
  if (banned) {
    return configurationErrorTask(`git.fetch: potential exploit argument blocked.`);
  }
  return {
    commands,
    format: "utf-8",
    parser: parseFetchResult
  };
}
function parseMoveResult(stdOut) {
  return parseStringResponse({ moves: [] }, parsers11, stdOut);
}
function moveTask(from, to) {
  return {
    commands: ["mv", "-v", ...asArray(from), to],
    format: "utf-8",
    parser: parseMoveResult
  };
}
function pullTask(remote, branch, customArgs) {
  const commands = ["pull", ...customArgs];
  if (remote && branch) {
    commands.splice(1, 0, remote, branch);
  }
  return {
    commands,
    format: "utf-8",
    parser(stdOut, stdErr) {
      return parsePullResult(stdOut, stdErr);
    },
    onError(result, _error, _done, fail) {
      const pullError = parsePullErrorResult(
        bufferToString(result.stdOut),
        bufferToString(result.stdErr)
      );
      if (pullError) {
        return fail(new GitResponseError(pullError));
      }
      fail(_error);
    }
  };
}
function parseGetRemotes(text) {
  const remotes = {};
  forEach(text, ([name]) => remotes[name] = { name });
  return Object.values(remotes);
}
function parseGetRemotesVerbose(text) {
  const remotes = {};
  forEach(text, ([name, url, purpose]) => {
    if (!Object.hasOwn(remotes, name)) {
      remotes[name] = {
        name,
        refs: { fetch: "", push: "" }
      };
    }
    if (purpose && url) {
      remotes[name].refs[purpose.replace(/[^a-z]/g, "")] = url;
    }
  });
  return Object.values(remotes);
}
function forEach(text, handler) {
  forEachLineWithContent(text, (line) => handler(line.split(/\s+/)));
}
function addRemoteTask(remoteName, remoteRepo, customArgs) {
  return straightThroughStringTask(["remote", "add", ...customArgs, remoteName, remoteRepo]);
}
function getRemotesTask(verbose) {
  const commands = ["remote"];
  if (verbose) {
    commands.push("-v");
  }
  return {
    commands,
    format: "utf-8",
    parser: verbose ? parseGetRemotesVerbose : parseGetRemotes
  };
}
function listRemotesTask(customArgs) {
  const commands = [...customArgs];
  if (commands[0] !== "ls-remote") {
    commands.unshift("ls-remote");
  }
  return straightThroughStringTask(commands);
}
function remoteTask(customArgs) {
  const commands = [...customArgs];
  if (commands[0] !== "remote") {
    commands.unshift("remote");
  }
  return straightThroughStringTask(commands);
}
function removeRemoteTask(remoteName) {
  return straightThroughStringTask(["remote", "remove", remoteName]);
}
function stashListTask(opt = {}, customArgs) {
  const options = parseLogOptions(opt);
  const commands = ["stash", "list", ...options.commands, ...customArgs];
  const parser4 = createListLogSummaryParser(
    options.splitter,
    options.fields,
    logFormatFromCommand(commands)
  );
  return validateLogFormatConfig(commands) || {
    commands,
    format: "utf-8",
    parser: parser4
  };
}
function addSubModuleTask(repo, path) {
  return subModuleTask(["add", repo, path]);
}
function initSubModuleTask(customArgs) {
  return subModuleTask(["init", ...customArgs]);
}
function subModuleTask(customArgs) {
  const commands = [...customArgs];
  if (commands[0] !== "submodule") {
    commands.unshift("submodule");
  }
  return straightThroughStringTask(commands);
}
function updateSubModuleTask(customArgs) {
  return subModuleTask(["update", ...customArgs]);
}
function singleSorted(a, b2) {
  const aIsNum = Number.isNaN(a);
  const bIsNum = Number.isNaN(b2);
  if (aIsNum !== bIsNum) {
    return aIsNum ? 1 : -1;
  }
  return aIsNum ? sorted(a, b2) : 0;
}
function sorted(a, b2) {
  return a === b2 ? 0 : a > b2 ? 1 : -1;
}
function trimmed(input) {
  return input.trim();
}
function toNumber(input) {
  if (typeof input === "string") {
    return parseInt(input.replace(/^\D+/g, ""), 10) || 0;
  }
  return 0;
}
function tagListTask(customArgs = []) {
  const hasCustomSort = customArgs.some((option) => /^--sort=/.test(option));
  return {
    format: "utf-8",
    commands: ["tag", "-l", ...customArgs],
    parser(text) {
      return parseTagList(text, hasCustomSort);
    }
  };
}
function addTagTask(name) {
  return {
    format: "utf-8",
    commands: ["tag", name],
    parser() {
      return { name };
    }
  };
}
function addAnnotatedTagTask(name, tagMessage) {
  return {
    format: "utf-8",
    commands: ["tag", "-a", "-m", tagMessage, name],
    parser() {
      return { name };
    }
  };
}
function abortPlugin(signal) {
  if (!signal) {
    return;
  }
  const onSpawnAfter = {
    type: "spawn.after",
    action(_data, context) {
      function kill() {
        context.kill(new GitPluginError(void 0, "abort", "Abort signal received"));
      }
      signal.addEventListener("abort", kill);
      context.spawned.on("close", () => signal.removeEventListener("abort", kill));
    }
  };
  const onSpawnBefore = {
    type: "spawn.before",
    action(_data, context) {
      if (signal.aborted) {
        context.kill(new GitPluginError(void 0, "abort", "Abort already signaled"));
      }
    }
  };
  return [onSpawnBefore, onSpawnAfter];
}
function blockUnsafeOperationsPlugin(options = {}) {
  return {
    type: "spawn.args",
    action(args, { env: env2 }) {
      for (const vulnerability of ne(args, env2)) {
        if (options[vulnerability.category] !== true) {
          throw new GitPluginError(void 0, "unsafe", vulnerability.message);
        }
      }
      return args;
    }
  };
}
function commandConfigPrefixingPlugin(configuration) {
  const prefix = prefixedArray(configuration, "-c");
  return {
    type: "spawn.args",
    action(data) {
      return [...prefix, ...data];
    }
  };
}
function completionDetectionPlugin({
  onClose = true,
  onExit = 50
} = {}) {
  function createEvents() {
    let exitCode = -1;
    const events = {
      close: (0, import_promise_deferred2.deferred)(),
      closeTimeout: (0, import_promise_deferred2.deferred)(),
      exit: (0, import_promise_deferred2.deferred)(),
      exitTimeout: (0, import_promise_deferred2.deferred)()
    };
    const result = Promise.race([
      onClose === false ? never : events.closeTimeout.promise,
      onExit === false ? never : events.exitTimeout.promise
    ]);
    configureTimeout(onClose, events.close, events.closeTimeout);
    configureTimeout(onExit, events.exit, events.exitTimeout);
    return {
      close(code) {
        exitCode = code;
        events.close.done();
      },
      exit(code) {
        exitCode = code;
        events.exit.done();
      },
      get exitCode() {
        return exitCode;
      },
      result
    };
  }
  function configureTimeout(flag, event, timeout) {
    if (flag === false) {
      return;
    }
    (flag === true ? event.promise : event.promise.then(() => delay(flag))).then(timeout.done);
  }
  return {
    type: "spawn.after",
    async action(_data, { spawned, close }) {
      const events = createEvents();
      let deferClose = true;
      let quickClose = () => void (deferClose = false);
      spawned.stdout?.on("data", quickClose);
      spawned.stderr?.on("data", quickClose);
      spawned.on("error", quickClose);
      spawned.on("close", (code) => events.close(code));
      spawned.on("exit", (code) => events.exit(code));
      try {
        await events.result;
        if (deferClose) {
          await delay(50);
        }
        close(events.exitCode);
      } catch (err) {
        close(events.exitCode, err);
      }
    }
  };
}
function isBadArgument(arg) {
  return !arg || !/^([a-z]:)?([a-z0-9/.\\_~-]+)$/i.test(arg);
}
function toBinaryConfig(input, allowUnsafe) {
  if (input.length < 1 || input.length > 2) {
    throw new GitPluginError(void 0, "binary", WRONG_NUMBER_ERR);
  }
  const isBad = input.some(isBadArgument);
  if (isBad) {
    if (allowUnsafe) {
      console.warn(WRONG_CHARS_ERR);
    } else {
      throw new GitPluginError(void 0, "binary", WRONG_CHARS_ERR);
    }
  }
  const [binary, prefix] = input;
  return {
    binary,
    prefix
  };
}
function customBinaryPlugin(plugins, input = ["git"], allowUnsafe = false) {
  let config = toBinaryConfig(asArray(input), allowUnsafe);
  plugins.on("binary", (input2) => {
    config = toBinaryConfig(asArray(input2), allowUnsafe);
  });
  plugins.append("spawn.binary", () => {
    return config.binary;
  });
  plugins.append("spawn.args", (data) => {
    return config.prefix ? [config.prefix, ...data] : data;
  });
}
function isTaskError(result) {
  return !!(result.exitCode && result.stdErr.length);
}
function getErrorMessage(result) {
  return Buffer.concat([...result.stdOut, ...result.stdErr]);
}
function errorDetectionHandler(overwrite = false, isError = isTaskError, errorMessage = getErrorMessage) {
  return (error, result) => {
    if (!overwrite && error || !isError(result)) {
      return error;
    }
    return errorMessage(result);
  };
}
function errorDetectionPlugin(config) {
  return {
    type: "task.error",
    action(data, context) {
      const error = config(data.error, {
        stdErr: context.stdErr,
        stdOut: context.stdOut,
        exitCode: context.exitCode
      });
      if (Buffer.isBuffer(error)) {
        return { error: new GitError(void 0, error.toString("utf-8")) };
      }
      return {
        error
      };
    }
  };
}
function progressMonitorPlugin(progress) {
  const progressCommand = "--progress";
  const progressMethods = ["checkout", "clone", "fetch", "pull", "push"];
  const onProgress = {
    type: "spawn.after",
    action(_data, context) {
      if (!context.commands.includes(progressCommand)) {
        return;
      }
      context.spawned.stderr?.on("data", (chunk) => {
        const message = /^([\s\S]+?):\s*(\d+)% \((\d+)\/(\d+)\)/.exec(chunk.toString("utf8"));
        if (!message) {
          return;
        }
        progress({
          method: context.method,
          stage: progressEventStage(message[1]),
          progress: asNumber(message[2]),
          processed: asNumber(message[3]),
          total: asNumber(message[4])
        });
      });
    }
  };
  const onArgs = {
    type: "spawn.args",
    action(args, context) {
      if (!progressMethods.includes(context.method)) {
        return args;
      }
      return including(args, progressCommand);
    }
  };
  return [onArgs, onProgress];
}
function progressEventStage(input) {
  return String(input.toLowerCase().split(" ", 1)) || "unknown";
}
function spawnOptionsPlugin(spawnOptions) {
  const options = pick(spawnOptions, ["uid", "gid"]);
  return {
    type: "spawn.options",
    action(data) {
      return { ...options, ...data };
    }
  };
}
function timeoutPlugin({
  block,
  stdErr = true,
  stdOut = true
}) {
  if (block > 0) {
    return {
      type: "spawn.after",
      action(_data, context) {
        let timeout;
        function wait() {
          timeout && clearTimeout(timeout);
          timeout = setTimeout(kill, block);
        }
        function stop() {
          context.spawned.stdout?.off("data", wait);
          context.spawned.stderr?.off("data", wait);
          context.spawned.off("exit", stop);
          context.spawned.off("close", stop);
          timeout && clearTimeout(timeout);
        }
        function kill() {
          stop();
          context.kill(new GitPluginError(void 0, "timeout", `block timeout reached`));
        }
        stdOut && context.spawned.stdout?.on("data", wait);
        stdErr && context.spawned.stderr?.on("data", wait);
        context.spawned.on("exit", stop);
        context.spawned.on("close", stop);
        wait();
      }
    };
  }
}
function suffixPathsPlugin() {
  return {
    type: "spawn.args",
    action(data) {
      const prefix = [];
      let suffix;
      function append2(args) {
        (suffix = suffix || []).push(...args);
      }
      for (let i2 = 0; i2 < data.length; i2++) {
        const param = data[i2];
        if (r(param)) {
          append2(o(param));
          continue;
        }
        if (param === "--") {
          append2(
            data.slice(i2 + 1).flatMap((item) => r(item) && o(item) || item)
          );
          break;
        }
        prefix.push(param);
      }
      return !suffix ? prefix : [...prefix, "--", ...suffix.map(String)];
    }
  };
}
function gitInstanceFactory(baseDir, options) {
  const plugins = new PluginStore();
  const config = createInstanceConfig(
    baseDir && (typeof baseDir === "string" ? { baseDir } : baseDir) || {},
    options
  );
  if (!folderExists(config.baseDir)) {
    throw new GitConstructError(
      config,
      `Cannot use simple-git on a directory that does not exist`
    );
  }
  if (Array.isArray(config.config)) {
    plugins.add(commandConfigPrefixingPlugin(config.config));
  }
  plugins.add(blockUnsafeOperationsPlugin(config.unsafe));
  plugins.add(completionDetectionPlugin(config.completion));
  config.abort && plugins.add(abortPlugin(config.abort));
  config.progress && plugins.add(progressMonitorPlugin(config.progress));
  config.timeout && plugins.add(timeoutPlugin(config.timeout));
  config.spawnOptions && plugins.add(spawnOptionsPlugin(config.spawnOptions));
  plugins.add(suffixPathsPlugin());
  plugins.add(errorDetectionPlugin(errorDetectionHandler(true)));
  config.errors && plugins.add(errorDetectionPlugin(config.errors));
  customBinaryPlugin(plugins, config.binary, config.unsafe?.allowUnsafeCustomBinary);
  return new Git(config, plugins);
}
var import_file_exists, import_debug, import_promise_deferred, import_promise_deferred2, __defProp2, __getOwnPropDesc2, __getOwnPropNames2, __hasOwnProp2, __esm2, __commonJS2, __export2, __copyProps2, __toCommonJS, GitError, init_git_error, GitResponseError, init_git_response_error, TaskConfigurationError, init_task_configuration_error, NULL, NOOP, objectToString, init_util2, filterArray, filterNumber, filterString, filterStringOrStringArray, filterHasLength, init_argument_filters, ExitCodes, init_exit_codes, GitOutputStreams, init_git_output_streams, LineParser, RemoteLineParser, init_line_parser, defaultOptions, init_simple_git_options, init_task_options, init_task_parser, utils_exports, init_utils, check_is_repo_exports, CheckRepoActions, onError, parser, init_check_is_repo, CleanResponse, removalRegexp, dryRunRemovalRegexp, isFolderRegexp, init_CleanSummary, task_exports, EMPTY_COMMANDS, init_task, clean_exports, CONFIG_ERROR_INTERACTIVE_MODE, CONFIG_ERROR_MODE_REQUIRED, CONFIG_ERROR_UNKNOWN_OPTION, CleanOptions, CleanOptionValues, init_clean, ConfigList, init_ConfigList, GitConfigScope, init_config2, DiffNameStatus, diffNameStatus, init_diff_name_status, disallowedOptions, Query, _a, GrepQuery, init_grep, reset_exports, ResetMode, validResetModes, init_reset, init_git_logger, TasksPendingQueue, init_tasks_pending_queue, GitExecutorChain, init_git_executor_chain, git_executor_exports, GitExecutor, init_git_executor, init_task_callback, init_change_working_directory, init_checkout, parser2, init_count_objects, parsers, init_parse_commit, init_commit, init_first_commit, init_hash_object, InitSummary, initResponseRegex, reInitResponseRegex, init_InitSummary, bareCommand, init_init, logFormatRegex, init_log_format, DiffSummary, init_DiffSummary, statParser, numStatParser, nameOnlyParser, nameStatusParser, diffSummaryParsers, init_parse_diff_summary, START_BOUNDARY, COMMIT_BOUNDARY, SPLITTER, defaultFieldNames, init_parse_list_log_summary, diff_exports, init_diff, excludeOptions, init_log, MergeSummaryConflict, MergeSummaryDetail, init_MergeSummary, PullSummary, PullFailedSummary, init_PullSummary, remoteMessagesObjectParsers, init_parse_remote_objects, parsers2, RemoteMessageSummary, init_parse_remote_messages, FILE_UPDATE_REGEX, SUMMARY_REGEX, ACTION_REGEX, parsers3, errorParsers, parsePullDetail, parsePullResult, init_parse_pull, parsers4, parseMergeResult, parseMergeDetail, init_parse_merge, init_merge, parsers5, parsePushResult, parsePushDetail, init_parse_push, push_exports, init_push, init_show, fromPathRegex, FileStatusSummary, init_FileStatusSummary, StatusSummary, parsers6, parseStatusSummary, init_StatusSummary, ignoredOptions, init_status2, NOT_INSTALLED, parsers7, init_version, cloneTask, cloneMirrorTask, init_clone, simple_git_api_exports, SimpleGitApi, init_simple_git_api, scheduler_exports, createScheduledTask, Scheduler, init_scheduler, apply_patch_exports, init_apply_patch, BranchDeletionBatch, init_BranchDeleteSummary, deleteSuccessRegex, deleteErrorRegex, parsers8, parseBranchDeletions, init_parse_branch_delete, BranchSummaryResult, init_BranchSummary, parsers9, currentBranchParser, init_parse_branch, branch_exports, init_branch, parseCheckIgnore, init_CheckIgnore, check_ignore_exports, init_check_ignore, parsers10, init_parse_fetch, fetch_exports, init_fetch, parsers11, init_parse_move, move_exports, init_move, pull_exports, init_pull, init_GetRemoteSummary, remote_exports, init_remote, stash_list_exports, init_stash_list, sub_module_exports, init_sub_module, TagList, parseTagList, init_TagList, tag_exports, init_tag, require_git, GitConstructError, GitPluginError, never, WRONG_NUMBER_ERR, WRONG_CHARS_ERR, PluginStore, Git, simpleGit;
var init_esm = __esm({
  "node_modules/simple-git/dist/esm/index.js"() {
    import_file_exists = __toESM(require_dist(), 1);
    init_dist();
    init_dist();
    import_debug = __toESM(require_src(), 1);
    init_dist();
    init_dist();
    import_promise_deferred = __toESM(require_dist2(), 1);
    init_dist();
    init_dist2();
    import_promise_deferred2 = __toESM(require_dist2(), 1);
    init_dist();
    __defProp2 = Object.defineProperty;
    __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
    __getOwnPropNames2 = Object.getOwnPropertyNames;
    __hasOwnProp2 = Object.prototype.hasOwnProperty;
    __esm2 = (fn, res) => function __init() {
      return fn && (res = (0, fn[__getOwnPropNames2(fn)[0]])(fn = 0)), res;
    };
    __commonJS2 = (cb, mod) => function __require2() {
      return mod || (0, cb[__getOwnPropNames2(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    };
    __export2 = (target, all) => {
      for (var name in all)
        __defProp2(target, name, { get: all[name], enumerable: true });
    };
    __copyProps2 = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames2(from))
          if (!__hasOwnProp2.call(to, key) && key !== except)
            __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
      }
      return to;
    };
    __toCommonJS = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
    init_git_error = __esm2({
      "src/lib/errors/git-error.ts"() {
        "use strict";
        GitError = class extends Error {
          constructor(task, message) {
            super(message);
            this.task = task;
            Object.setPrototypeOf(this, new.target.prototype);
          }
        };
      }
    });
    init_git_response_error = __esm2({
      "src/lib/errors/git-response-error.ts"() {
        "use strict";
        init_git_error();
        GitResponseError = class extends GitError {
          constructor(git, message) {
            super(void 0, message || String(git));
            this.git = git;
          }
        };
      }
    });
    init_task_configuration_error = __esm2({
      "src/lib/errors/task-configuration-error.ts"() {
        "use strict";
        init_git_error();
        TaskConfigurationError = class extends GitError {
          constructor(message) {
            super(void 0, message);
          }
        };
      }
    });
    init_util2 = __esm2({
      "src/lib/utils/util.ts"() {
        "use strict";
        init_argument_filters();
        NULL = "\0";
        NOOP = () => {
        };
        objectToString = Object.prototype.toString.call.bind(Object.prototype.toString);
      }
    });
    init_argument_filters = __esm2({
      "src/lib/utils/argument-filters.ts"() {
        "use strict";
        init_util2();
        filterArray = (input) => {
          return Array.isArray(input);
        };
        filterNumber = (input) => {
          return typeof input === "number";
        };
        filterString = (input) => {
          return typeof input === "string" || r(input);
        };
        filterStringOrStringArray = (input) => {
          return filterString(input) || Array.isArray(input) && input.every(filterString);
        };
        filterHasLength = (input) => {
          if (input == null || "number|boolean|function".includes(typeof input)) {
            return false;
          }
          return typeof input.length === "number";
        };
      }
    });
    init_exit_codes = __esm2({
      "src/lib/utils/exit-codes.ts"() {
        "use strict";
        ExitCodes = /* @__PURE__ */ ((ExitCodes2) => {
          ExitCodes2[ExitCodes2["SUCCESS"] = 0] = "SUCCESS";
          ExitCodes2[ExitCodes2["ERROR"] = 1] = "ERROR";
          ExitCodes2[ExitCodes2["NOT_FOUND"] = -2] = "NOT_FOUND";
          ExitCodes2[ExitCodes2["UNCLEAN"] = 128] = "UNCLEAN";
          return ExitCodes2;
        })(ExitCodes || {});
      }
    });
    init_git_output_streams = __esm2({
      "src/lib/utils/git-output-streams.ts"() {
        "use strict";
        GitOutputStreams = class _GitOutputStreams {
          constructor(stdOut, stdErr) {
            this.stdOut = stdOut;
            this.stdErr = stdErr;
          }
          asStrings() {
            return new _GitOutputStreams(this.stdOut.toString("utf8"), this.stdErr.toString("utf8"));
          }
        };
      }
    });
    init_line_parser = __esm2({
      "src/lib/utils/line-parser.ts"() {
        "use strict";
        LineParser = class {
          constructor(regExp, useMatches) {
            this.matches = [];
            this.useMatches = useMatchesDefault;
            this.parse = (line, target) => {
              this.resetMatches();
              if (!this._regExp.every((reg, index) => this.addMatch(reg, index, line(index)))) {
                return false;
              }
              return this.useMatches(target, this.prepareMatches()) !== false;
            };
            this._regExp = Array.isArray(regExp) ? regExp : [regExp];
            if (useMatches) {
              this.useMatches = useMatches;
            }
          }
          resetMatches() {
            this.matches.length = 0;
          }
          prepareMatches() {
            return this.matches;
          }
          addMatch(reg, index, line) {
            const matched = line && reg.exec(line);
            if (matched) {
              this.pushMatch(index, matched);
            }
            return !!matched;
          }
          pushMatch(_index, matched) {
            this.matches.push(...matched.slice(1));
          }
        };
        RemoteLineParser = class extends LineParser {
          addMatch(reg, index, line) {
            return /^remote:\s/.test(String(line)) && super.addMatch(reg, index, line);
          }
          pushMatch(index, matched) {
            if (index > 0 || matched.length > 1) {
              super.pushMatch(index, matched);
            }
          }
        };
      }
    });
    init_simple_git_options = __esm2({
      "src/lib/utils/simple-git-options.ts"() {
        "use strict";
        defaultOptions = {
          binary: "git",
          maxConcurrentProcesses: 5,
          config: [],
          trimmed: false
        };
      }
    });
    init_task_options = __esm2({
      "src/lib/utils/task-options.ts"() {
        "use strict";
        init_argument_filters();
        init_util2();
      }
    });
    init_task_parser = __esm2({
      "src/lib/utils/task-parser.ts"() {
        "use strict";
        init_util2();
      }
    });
    utils_exports = {};
    __export2(utils_exports, {
      ExitCodes: () => ExitCodes,
      GitOutputStreams: () => GitOutputStreams,
      LineParser: () => LineParser,
      NOOP: () => NOOP,
      NULL: () => NULL,
      RemoteLineParser: () => RemoteLineParser,
      append: () => append,
      appendTaskOptions: () => appendTaskOptions,
      asArray: () => asArray,
      asCamelCase: () => asCamelCase,
      asFunction: () => asFunction,
      asNumber: () => asNumber,
      asStringArray: () => asStringArray,
      bufferToString: () => bufferToString,
      callTaskParser: () => callTaskParser,
      createInstanceConfig: () => createInstanceConfig,
      delay: () => delay,
      filterArray: () => filterArray,
      filterFunction: () => filterFunction,
      filterHasLength: () => filterHasLength,
      filterNumber: () => filterNumber,
      filterPlainObject: () => filterPlainObject,
      filterPrimitives: () => filterPrimitives,
      filterString: () => filterString,
      filterStringOrStringArray: () => filterStringOrStringArray,
      filterType: () => filterType,
      first: () => first,
      folderExists: () => folderExists,
      forEachLineWithContent: () => forEachLineWithContent,
      getTrailingOptions: () => getTrailingOptions,
      including: () => including,
      isUserFunction: () => isUserFunction,
      last: () => last,
      objectToString: () => objectToString,
      orVoid: () => orVoid,
      parseStringResponse: () => parseStringResponse,
      pick: () => pick,
      prefixedArray: () => prefixedArray,
      remove: () => remove,
      splitOn: () => splitOn,
      toLinesWithContent: () => toLinesWithContent,
      trailingFunctionArgument: () => trailingFunctionArgument,
      trailingOptionsArgument: () => trailingOptionsArgument
    });
    init_utils = __esm2({
      "src/lib/utils/index.ts"() {
        "use strict";
        init_argument_filters();
        init_exit_codes();
        init_git_output_streams();
        init_line_parser();
        init_simple_git_options();
        init_task_options();
        init_task_parser();
        init_util2();
      }
    });
    check_is_repo_exports = {};
    __export2(check_is_repo_exports, {
      CheckRepoActions: () => CheckRepoActions,
      checkIsBareRepoTask: () => checkIsBareRepoTask,
      checkIsRepoRootTask: () => checkIsRepoRootTask,
      checkIsRepoTask: () => checkIsRepoTask
    });
    init_check_is_repo = __esm2({
      "src/lib/tasks/check-is-repo.ts"() {
        "use strict";
        init_utils();
        CheckRepoActions = /* @__PURE__ */ ((CheckRepoActions2) => {
          CheckRepoActions2["BARE"] = "bare";
          CheckRepoActions2["IN_TREE"] = "tree";
          CheckRepoActions2["IS_REPO_ROOT"] = "root";
          return CheckRepoActions2;
        })(CheckRepoActions || {});
        onError = ({ exitCode }, error, done, fail) => {
          if (exitCode === 128 && isNotRepoMessage(error)) {
            return done(Buffer.from("false"));
          }
          fail(error);
        };
        parser = (text) => {
          return text.trim() === "true";
        };
      }
    });
    init_CleanSummary = __esm2({
      "src/lib/responses/CleanSummary.ts"() {
        "use strict";
        init_utils();
        CleanResponse = class {
          constructor(dryRun) {
            this.dryRun = dryRun;
            this.paths = [];
            this.files = [];
            this.folders = [];
          }
        };
        removalRegexp = /^[a-z]+\s*/i;
        dryRunRemovalRegexp = /^[a-z]+\s+[a-z]+\s*/i;
        isFolderRegexp = /\/$/;
      }
    });
    task_exports = {};
    __export2(task_exports, {
      EMPTY_COMMANDS: () => EMPTY_COMMANDS,
      adhocExecTask: () => adhocExecTask,
      configurationErrorTask: () => configurationErrorTask,
      isBufferTask: () => isBufferTask,
      isEmptyTask: () => isEmptyTask,
      straightThroughBufferTask: () => straightThroughBufferTask,
      straightThroughStringTask: () => straightThroughStringTask
    });
    init_task = __esm2({
      "src/lib/tasks/task.ts"() {
        "use strict";
        init_task_configuration_error();
        EMPTY_COMMANDS = [];
      }
    });
    clean_exports = {};
    __export2(clean_exports, {
      CONFIG_ERROR_INTERACTIVE_MODE: () => CONFIG_ERROR_INTERACTIVE_MODE,
      CONFIG_ERROR_MODE_REQUIRED: () => CONFIG_ERROR_MODE_REQUIRED,
      CONFIG_ERROR_UNKNOWN_OPTION: () => CONFIG_ERROR_UNKNOWN_OPTION,
      CleanOptions: () => CleanOptions,
      cleanTask: () => cleanTask,
      cleanWithOptionsTask: () => cleanWithOptionsTask,
      isCleanOptionsArray: () => isCleanOptionsArray
    });
    init_clean = __esm2({
      "src/lib/tasks/clean.ts"() {
        "use strict";
        init_CleanSummary();
        init_utils();
        init_task();
        CONFIG_ERROR_INTERACTIVE_MODE = "Git clean interactive mode is not supported";
        CONFIG_ERROR_MODE_REQUIRED = 'Git clean mode parameter ("n" or "f") is required';
        CONFIG_ERROR_UNKNOWN_OPTION = "Git clean unknown option found in: ";
        CleanOptions = /* @__PURE__ */ ((CleanOptions2) => {
          CleanOptions2["DRY_RUN"] = "n";
          CleanOptions2["FORCE"] = "f";
          CleanOptions2["IGNORED_INCLUDED"] = "x";
          CleanOptions2["IGNORED_ONLY"] = "X";
          CleanOptions2["EXCLUDING"] = "e";
          CleanOptions2["QUIET"] = "q";
          CleanOptions2["RECURSIVE"] = "d";
          return CleanOptions2;
        })(CleanOptions || {});
        CleanOptionValues = /* @__PURE__ */ new Set([
          "i",
          ...asStringArray(Object.values(CleanOptions))
        ]);
      }
    });
    init_ConfigList = __esm2({
      "src/lib/responses/ConfigList.ts"() {
        "use strict";
        init_utils();
        ConfigList = class {
          constructor() {
            this.files = [];
            this.values = /* @__PURE__ */ Object.create(null);
          }
          get all() {
            if (!this._all) {
              this._all = this.files.reduce((all, file) => {
                return Object.assign(all, this.values[file]);
              }, {});
            }
            return this._all;
          }
          addFile(file) {
            if (!(file in this.values)) {
              const latest = last(this.files);
              this.values[file] = latest ? Object.create(this.values[latest]) : {};
              this.files.push(file);
            }
            return this.values[file];
          }
          addValue(file, key, value) {
            const values = this.addFile(file);
            if (!Object.hasOwn(values, key)) {
              values[key] = value;
            } else if (Array.isArray(values[key])) {
              values[key].push(value);
            } else {
              values[key] = [values[key], value];
            }
            this._all = void 0;
          }
        };
      }
    });
    init_config2 = __esm2({
      "src/lib/tasks/config.ts"() {
        "use strict";
        init_ConfigList();
        init_utils();
        GitConfigScope = /* @__PURE__ */ ((GitConfigScope2) => {
          GitConfigScope2["system"] = "system";
          GitConfigScope2["global"] = "global";
          GitConfigScope2["local"] = "local";
          GitConfigScope2["worktree"] = "worktree";
          return GitConfigScope2;
        })(GitConfigScope || {});
      }
    });
    init_diff_name_status = __esm2({
      "src/lib/tasks/diff-name-status.ts"() {
        "use strict";
        DiffNameStatus = /* @__PURE__ */ ((DiffNameStatus2) => {
          DiffNameStatus2["ADDED"] = "A";
          DiffNameStatus2["COPIED"] = "C";
          DiffNameStatus2["DELETED"] = "D";
          DiffNameStatus2["MODIFIED"] = "M";
          DiffNameStatus2["RENAMED"] = "R";
          DiffNameStatus2["CHANGED"] = "T";
          DiffNameStatus2["UNMERGED"] = "U";
          DiffNameStatus2["UNKNOWN"] = "X";
          DiffNameStatus2["BROKEN"] = "B";
          return DiffNameStatus2;
        })(DiffNameStatus || {});
        diffNameStatus = new Set(Object.values(DiffNameStatus));
      }
    });
    init_grep = __esm2({
      "src/lib/tasks/grep.ts"() {
        "use strict";
        init_utils();
        init_task();
        disallowedOptions = ["-h"];
        Query = Symbol("grepQuery");
        GrepQuery = class {
          constructor() {
            this[_a] = [];
          }
          *[(_a = Query, Symbol.iterator)]() {
            for (const query of this[Query]) {
              yield query;
            }
          }
          and(...and) {
            and.length && this[Query].push("--and", "(", ...prefixedArray(and, "-e"), ")");
            return this;
          }
          param(...param) {
            this[Query].push(...prefixedArray(param, "-e"));
            return this;
          }
        };
      }
    });
    reset_exports = {};
    __export2(reset_exports, {
      ResetMode: () => ResetMode,
      getResetMode: () => getResetMode,
      resetTask: () => resetTask
    });
    init_reset = __esm2({
      "src/lib/tasks/reset.ts"() {
        "use strict";
        init_utils();
        init_task();
        ResetMode = /* @__PURE__ */ ((ResetMode2) => {
          ResetMode2["MIXED"] = "mixed";
          ResetMode2["SOFT"] = "soft";
          ResetMode2["HARD"] = "hard";
          ResetMode2["MERGE"] = "merge";
          ResetMode2["KEEP"] = "keep";
          return ResetMode2;
        })(ResetMode || {});
        validResetModes = asStringArray(Object.values(ResetMode));
      }
    });
    init_git_logger = __esm2({
      "src/lib/git-logger.ts"() {
        "use strict";
        init_utils();
        import_debug.default.formatters.L = (value) => String(filterHasLength(value) ? value.length : "-");
        import_debug.default.formatters.B = (value) => {
          if (Buffer.isBuffer(value)) {
            return value.toString("utf8");
          }
          return objectToString(value);
        };
      }
    });
    init_tasks_pending_queue = __esm2({
      "src/lib/runners/tasks-pending-queue.ts"() {
        "use strict";
        init_git_error();
        init_git_logger();
        TasksPendingQueue = class _TasksPendingQueue {
          constructor(logLabel = "GitExecutor") {
            this.logLabel = logLabel;
            this._queue = /* @__PURE__ */ new Map();
          }
          withProgress(task) {
            return this._queue.get(task);
          }
          createProgress(task) {
            const name = _TasksPendingQueue.getName(task.commands[0]);
            const logger = createLogger(this.logLabel, name);
            return {
              task,
              logger,
              name
            };
          }
          push(task) {
            const progress = this.createProgress(task);
            progress.logger("Adding task to the queue, commands = %o", task.commands);
            this._queue.set(task, progress);
            return progress;
          }
          fatal(err) {
            for (const [task, { logger }] of Array.from(this._queue.entries())) {
              if (task === err.task) {
                logger.info(`Failed %o`, err);
                logger(
                  `Fatal exception, any as-yet un-started tasks run through this executor will not be attempted`
                );
              } else {
                logger.info(
                  `A fatal exception occurred in a previous task, the queue has been purged: %o`,
                  err.message
                );
              }
              this.complete(task);
            }
            if (this._queue.size !== 0) {
              throw new Error(`Queue size should be zero after fatal: ${this._queue.size}`);
            }
          }
          complete(task) {
            const progress = this.withProgress(task);
            if (progress) {
              this._queue.delete(task);
            }
          }
          attempt(task) {
            const progress = this.withProgress(task);
            if (!progress) {
              throw new GitError(void 0, "TasksPendingQueue: attempt called for an unknown task");
            }
            progress.logger("Starting task");
            return progress;
          }
          static getName(name = "empty") {
            return `task:${name}:${++_TasksPendingQueue.counter}`;
          }
          static {
            this.counter = 0;
          }
        };
      }
    });
    init_git_executor_chain = __esm2({
      "src/lib/runners/git-executor-chain.ts"() {
        "use strict";
        init_git_error();
        init_task();
        init_utils();
        init_tasks_pending_queue();
        GitExecutorChain = class {
          constructor(_executor, _scheduler, _plugins) {
            this._executor = _executor;
            this._scheduler = _scheduler;
            this._plugins = _plugins;
            this._chain = Promise.resolve();
            this._queue = new TasksPendingQueue();
          }
          get cwd() {
            return this._cwd || this._executor.cwd;
          }
          set cwd(cwd) {
            this._cwd = cwd;
          }
          get env() {
            return this._executor.env;
          }
          get outputHandler() {
            return this._executor.outputHandler;
          }
          chain() {
            return this;
          }
          push(task) {
            this._queue.push(task);
            return this._chain = this._chain.then(() => this.attemptTask(task));
          }
          async attemptTask(task) {
            const onScheduleComplete = await this._scheduler.next();
            const onQueueComplete = () => this._queue.complete(task);
            try {
              const { logger } = this._queue.attempt(task);
              return await (isEmptyTask(task) ? this.attemptEmptyTask(task, logger) : this.attemptRemoteTask(task, logger));
            } catch (e) {
              throw this.onFatalException(task, e);
            } finally {
              onQueueComplete();
              onScheduleComplete();
            }
          }
          onFatalException(task, e) {
            const gitError = e instanceof GitError ? Object.assign(e, { task }) : new GitError(task, e && String(e));
            this._chain = Promise.resolve();
            this._queue.fatal(gitError);
            return gitError;
          }
          async attemptRemoteTask(task, logger) {
            const binary = this._plugins.exec("spawn.binary", "", pluginContext(task, task.commands));
            const args = this._plugins.exec("spawn.args", [...task.commands], {
              ...pluginContext(task, task.commands),
              env: { ...this.env }
            });
            const raw = await this.gitResponse(
              task,
              binary,
              args,
              this.outputHandler,
              logger.step("SPAWN")
            );
            const outputStreams = await this.handleTaskData(task, args, raw, logger.step("HANDLE"));
            logger(`passing response to task's parser as a %s`, task.format);
            if (isBufferTask(task)) {
              return callTaskParser(task.parser, outputStreams);
            }
            return callTaskParser(task.parser, outputStreams.asStrings());
          }
          async attemptEmptyTask(task, logger) {
            logger(`empty task bypassing child process to call to task's parser`);
            return task.parser(this);
          }
          handleTaskData(task, args, result, logger) {
            const { exitCode, rejection, stdOut, stdErr } = result;
            return new Promise((done, fail) => {
              logger(`Preparing to handle process response exitCode=%d stdOut=`, exitCode);
              const { error } = this._plugins.exec(
                "task.error",
                { error: rejection },
                {
                  ...pluginContext(task, args),
                  ...result
                }
              );
              if (error && task.onError) {
                logger.info(`exitCode=%s handling with custom error handler`);
                return task.onError(
                  result,
                  error,
                  (newStdOut) => {
                    logger.info(`custom error handler treated as success`);
                    logger(`custom error returned a %s`, objectToString(newStdOut));
                    done(
                      new GitOutputStreams(
                        Array.isArray(newStdOut) ? Buffer.concat(newStdOut) : newStdOut,
                        Buffer.concat(stdErr)
                      )
                    );
                  },
                  fail
                );
              }
              if (error) {
                logger.info(
                  `handling as error: exitCode=%s stdErr=%s rejection=%o`,
                  exitCode,
                  stdErr.length,
                  rejection
                );
                return fail(error);
              }
              logger.info(`retrieving task output complete`);
              done(new GitOutputStreams(Buffer.concat(stdOut), Buffer.concat(stdErr)));
            });
          }
          async gitResponse(task, command, args, outputHandler, logger) {
            const outputLogger = logger.sibling("output");
            const spawnOptions = this._plugins.exec(
              "spawn.options",
              {
                cwd: this.cwd,
                env: this.env,
                windowsHide: true
              },
              pluginContext(task, task.commands)
            );
            return new Promise((done) => {
              const stdOut = [];
              const stdErr = [];
              logger.info(`%s %o`, command, args);
              logger("%O", spawnOptions);
              let rejection = this._beforeSpawn(task, args);
              if (rejection) {
                return done({
                  stdOut,
                  stdErr,
                  exitCode: 9901,
                  rejection
                });
              }
              this._plugins.exec("spawn.before", void 0, {
                ...pluginContext(task, args),
                kill(reason) {
                  rejection = reason || rejection;
                }
              });
              const spawned = spawn(command, args, spawnOptions);
              spawned.stdout.on(
                "data",
                onDataReceived(stdOut, "stdOut", logger, outputLogger.step("stdOut"))
              );
              spawned.stderr.on(
                "data",
                onDataReceived(stdErr, "stdErr", logger, outputLogger.step("stdErr"))
              );
              spawned.on("error", onErrorReceived(stdErr, logger));
              if (outputHandler) {
                logger(`Passing child process stdOut/stdErr to custom outputHandler`);
                outputHandler(command, spawned.stdout, spawned.stderr, [...args]);
              }
              this._plugins.exec("spawn.after", void 0, {
                ...pluginContext(task, args),
                spawned,
                close(exitCode, reason) {
                  done({
                    stdOut,
                    stdErr,
                    exitCode,
                    rejection: rejection || reason
                  });
                },
                kill(reason) {
                  if (spawned.killed) {
                    return;
                  }
                  rejection = reason;
                  spawned.kill("SIGINT");
                }
              });
            });
          }
          _beforeSpawn(task, args) {
            let rejection;
            this._plugins.exec("spawn.before", void 0, {
              ...pluginContext(task, args),
              kill(reason) {
                rejection = reason || rejection;
              }
            });
            return rejection;
          }
        };
      }
    });
    git_executor_exports = {};
    __export2(git_executor_exports, {
      GitExecutor: () => GitExecutor
    });
    init_git_executor = __esm2({
      "src/lib/runners/git-executor.ts"() {
        "use strict";
        init_git_executor_chain();
        GitExecutor = class {
          constructor(cwd, _scheduler, _plugins) {
            this.cwd = cwd;
            this._scheduler = _scheduler;
            this._plugins = _plugins;
            this._chain = new GitExecutorChain(this, this._scheduler, this._plugins);
          }
          chain() {
            return new GitExecutorChain(this, this._scheduler, this._plugins);
          }
          push(task) {
            return this._chain.push(task);
          }
        };
      }
    });
    init_task_callback = __esm2({
      "src/lib/task-callback.ts"() {
        "use strict";
        init_git_response_error();
        init_utils();
      }
    });
    init_change_working_directory = __esm2({
      "src/lib/tasks/change-working-directory.ts"() {
        "use strict";
        init_utils();
        init_task();
      }
    });
    init_checkout = __esm2({
      "src/lib/tasks/checkout.ts"() {
        "use strict";
        init_utils();
        init_task();
      }
    });
    init_count_objects = __esm2({
      "src/lib/tasks/count-objects.ts"() {
        "use strict";
        init_utils();
        parser2 = new LineParser(
          /([a-z-]+): (\d+)$/,
          (result, [key, value]) => {
            const property = asCamelCase(key);
            if (Object.hasOwn(result, property)) {
              result[property] = asNumber(value);
            }
          }
        );
      }
    });
    init_parse_commit = __esm2({
      "src/lib/parsers/parse-commit.ts"() {
        "use strict";
        init_utils();
        parsers = [
          new LineParser(/^\[([^\s]+)( \([^)]+\))? ([^\]]+)/, (result, [branch, root, commit]) => {
            result.branch = branch;
            result.commit = commit;
            result.root = !!root;
          }),
          new LineParser(/\s*Author:\s(.+)/i, (result, [author]) => {
            const parts = author.split("<");
            const email = parts.pop();
            if (!email || !email.includes("@")) {
              return;
            }
            result.author = {
              email: email.substr(0, email.length - 1),
              name: parts.join("<").trim()
            };
          }),
          new LineParser(
            /(\d+)[^,]*(?:,\s*(\d+)[^,]*)(?:,\s*(\d+))/g,
            (result, [changes, insertions, deletions]) => {
              result.summary.changes = parseInt(changes, 10) || 0;
              result.summary.insertions = parseInt(insertions, 10) || 0;
              result.summary.deletions = parseInt(deletions, 10) || 0;
            }
          ),
          new LineParser(
            /^(\d+)[^,]*(?:,\s*(\d+)[^(]+\(([+-]))?/,
            (result, [changes, lines, direction]) => {
              result.summary.changes = parseInt(changes, 10) || 0;
              const count = parseInt(lines, 10) || 0;
              if (direction === "-") {
                result.summary.deletions = count;
              } else if (direction === "+") {
                result.summary.insertions = count;
              }
            }
          )
        ];
      }
    });
    init_commit = __esm2({
      "src/lib/tasks/commit.ts"() {
        "use strict";
        init_parse_commit();
        init_utils();
        init_task();
      }
    });
    init_first_commit = __esm2({
      "src/lib/tasks/first-commit.ts"() {
        "use strict";
        init_utils();
        init_task();
      }
    });
    init_hash_object = __esm2({
      "src/lib/tasks/hash-object.ts"() {
        "use strict";
        init_task();
      }
    });
    init_InitSummary = __esm2({
      "src/lib/responses/InitSummary.ts"() {
        "use strict";
        InitSummary = class {
          constructor(bare, path, existing, gitDir) {
            this.bare = bare;
            this.path = path;
            this.existing = existing;
            this.gitDir = gitDir;
          }
        };
        initResponseRegex = /^Init.+ repository in (.+)$/;
        reInitResponseRegex = /^Rein.+ in (.+)$/;
      }
    });
    init_init = __esm2({
      "src/lib/tasks/init.ts"() {
        "use strict";
        init_InitSummary();
        bareCommand = "--bare";
      }
    });
    init_log_format = __esm2({
      "src/lib/args/log-format.ts"() {
        "use strict";
        logFormatRegex = /^--(stat|numstat|name-only|name-status)(=|$)/;
      }
    });
    init_DiffSummary = __esm2({
      "src/lib/responses/DiffSummary.ts"() {
        "use strict";
        DiffSummary = class {
          constructor() {
            this.changed = 0;
            this.deletions = 0;
            this.insertions = 0;
            this.files = [];
          }
        };
      }
    });
    init_parse_diff_summary = __esm2({
      "src/lib/parsers/parse-diff-summary.ts"() {
        "use strict";
        init_log_format();
        init_DiffSummary();
        init_diff_name_status();
        init_utils();
        statParser = [
          new LineParser(
            /^(.+)\s+\|\s+(\d+)(\s+[+\-]+)?$/,
            (result, [file, changes, alterations = ""]) => {
              result.files.push({
                file: file.trim(),
                changes: asNumber(changes),
                insertions: alterations.replace(/[^+]/g, "").length,
                deletions: alterations.replace(/[^-]/g, "").length,
                binary: false
              });
            }
          ),
          new LineParser(
            /^(.+) \|\s+Bin ([0-9.]+) -> ([0-9.]+) ([a-z]+)/,
            (result, [file, before, after]) => {
              result.files.push({
                file: file.trim(),
                before: asNumber(before),
                after: asNumber(after),
                binary: true
              });
            }
          ),
          new LineParser(
            /(\d+) files? changed\s*((?:, \d+ [^,]+){0,2})/,
            (result, [changed, summary]) => {
              const inserted = /(\d+) i/.exec(summary);
              const deleted = /(\d+) d/.exec(summary);
              result.changed = asNumber(changed);
              result.insertions = asNumber(inserted?.[1]);
              result.deletions = asNumber(deleted?.[1]);
            }
          )
        ];
        numStatParser = [
          new LineParser(
            /(\d+)\t(\d+)\t(.+)$/,
            (result, [changesInsert, changesDelete, file]) => {
              const insertions = asNumber(changesInsert);
              const deletions = asNumber(changesDelete);
              result.changed++;
              result.insertions += insertions;
              result.deletions += deletions;
              result.files.push({
                file,
                changes: insertions + deletions,
                insertions,
                deletions,
                binary: false
              });
            }
          ),
          new LineParser(/-\t-\t(.+)$/, (result, [file]) => {
            result.changed++;
            result.files.push({
              file,
              after: 0,
              before: 0,
              binary: true
            });
          })
        ];
        nameOnlyParser = [
          new LineParser(/(.+)$/, (result, [file]) => {
            result.changed++;
            result.files.push({
              file,
              changes: 0,
              insertions: 0,
              deletions: 0,
              binary: false
            });
          })
        ];
        nameStatusParser = [
          new LineParser(
            /([ACDMRTUXB])([0-9]{0,3})\t(.[^\t]*)(\t(.[^\t]*))?$/,
            (result, [status, similarity, from, _to, to]) => {
              result.changed++;
              result.files.push({
                file: to ?? from,
                changes: 0,
                insertions: 0,
                deletions: 0,
                binary: false,
                status: orVoid(isDiffNameStatus(status) && status),
                from: orVoid(!!to && from !== to && from),
                similarity: asNumber(similarity)
              });
            }
          )
        ];
        diffSummaryParsers = {
          [
            ""
            /* NONE */
          ]: statParser,
          [
            "--stat"
            /* STAT */
          ]: statParser,
          [
            "--numstat"
            /* NUM_STAT */
          ]: numStatParser,
          [
            "--name-status"
            /* NAME_STATUS */
          ]: nameStatusParser,
          [
            "--name-only"
            /* NAME_ONLY */
          ]: nameOnlyParser
        };
      }
    });
    init_parse_list_log_summary = __esm2({
      "src/lib/parsers/parse-list-log-summary.ts"() {
        "use strict";
        init_utils();
        init_parse_diff_summary();
        init_log_format();
        START_BOUNDARY = "\xF2\xF2\xF2\xF2\xF2\xF2 ";
        COMMIT_BOUNDARY = " \xF2\xF2";
        SPLITTER = " \xF2 ";
        defaultFieldNames = ["hash", "date", "message", "refs", "author_name", "author_email"];
      }
    });
    diff_exports = {};
    __export2(diff_exports, {
      diffSummaryTask: () => diffSummaryTask,
      validateLogFormatConfig: () => validateLogFormatConfig
    });
    init_diff = __esm2({
      "src/lib/tasks/diff.ts"() {
        "use strict";
        init_log_format();
        init_parse_diff_summary();
        init_task();
      }
    });
    init_log = __esm2({
      "src/lib/tasks/log.ts"() {
        "use strict";
        init_log_format();
        init_parse_list_log_summary();
        init_utils();
        init_task();
        init_diff();
        excludeOptions = /* @__PURE__ */ ((excludeOptions2) => {
          excludeOptions2[excludeOptions2["--pretty"] = 0] = "--pretty";
          excludeOptions2[excludeOptions2["max-count"] = 1] = "max-count";
          excludeOptions2[excludeOptions2["maxCount"] = 2] = "maxCount";
          excludeOptions2[excludeOptions2["n"] = 3] = "n";
          excludeOptions2[excludeOptions2["file"] = 4] = "file";
          excludeOptions2[excludeOptions2["format"] = 5] = "format";
          excludeOptions2[excludeOptions2["from"] = 6] = "from";
          excludeOptions2[excludeOptions2["to"] = 7] = "to";
          excludeOptions2[excludeOptions2["splitter"] = 8] = "splitter";
          excludeOptions2[excludeOptions2["symmetric"] = 9] = "symmetric";
          excludeOptions2[excludeOptions2["mailMap"] = 10] = "mailMap";
          excludeOptions2[excludeOptions2["multiLine"] = 11] = "multiLine";
          excludeOptions2[excludeOptions2["strictDate"] = 12] = "strictDate";
          return excludeOptions2;
        })(excludeOptions || {});
      }
    });
    init_MergeSummary = __esm2({
      "src/lib/responses/MergeSummary.ts"() {
        "use strict";
        MergeSummaryConflict = class {
          constructor(reason, file = null, meta) {
            this.reason = reason;
            this.file = file;
            this.meta = meta;
          }
          toString() {
            return `${this.file}:${this.reason}`;
          }
        };
        MergeSummaryDetail = class {
          constructor() {
            this.conflicts = [];
            this.merges = [];
            this.result = "success";
          }
          get failed() {
            return this.conflicts.length > 0;
          }
          get reason() {
            return this.result;
          }
          toString() {
            if (this.conflicts.length) {
              return `CONFLICTS: ${this.conflicts.join(", ")}`;
            }
            return "OK";
          }
        };
      }
    });
    init_PullSummary = __esm2({
      "src/lib/responses/PullSummary.ts"() {
        "use strict";
        PullSummary = class {
          constructor() {
            this.remoteMessages = {
              all: []
            };
            this.created = [];
            this.deleted = [];
            this.files = [];
            this.deletions = {};
            this.insertions = {};
            this.summary = {
              changes: 0,
              deletions: 0,
              insertions: 0
            };
          }
        };
        PullFailedSummary = class {
          constructor() {
            this.remote = "";
            this.hash = {
              local: "",
              remote: ""
            };
            this.branch = {
              local: "",
              remote: ""
            };
            this.message = "";
          }
          toString() {
            return this.message;
          }
        };
      }
    });
    init_parse_remote_objects = __esm2({
      "src/lib/parsers/parse-remote-objects.ts"() {
        "use strict";
        init_utils();
        remoteMessagesObjectParsers = [
          new RemoteLineParser(
            /^remote:\s*(enumerating|counting|compressing) objects: (\d+),/i,
            (result, [action, count]) => {
              const key = action.toLowerCase();
              const enumeration = objectEnumerationResult(result.remoteMessages);
              Object.assign(enumeration, { [key]: asNumber(count) });
            }
          ),
          new RemoteLineParser(
            /^remote:\s*(enumerating|counting|compressing) objects: \d+% \(\d+\/(\d+)\),/i,
            (result, [action, count]) => {
              const key = action.toLowerCase();
              const enumeration = objectEnumerationResult(result.remoteMessages);
              Object.assign(enumeration, { [key]: asNumber(count) });
            }
          ),
          new RemoteLineParser(
            /total ([^,]+), reused ([^,]+), pack-reused (\d+)/i,
            (result, [total, reused, packReused]) => {
              const objects = objectEnumerationResult(result.remoteMessages);
              objects.total = asObjectCount(total);
              objects.reused = asObjectCount(reused);
              objects.packReused = asNumber(packReused);
            }
          )
        ];
      }
    });
    init_parse_remote_messages = __esm2({
      "src/lib/parsers/parse-remote-messages.ts"() {
        "use strict";
        init_utils();
        init_parse_remote_objects();
        parsers2 = [
          new RemoteLineParser(/^remote:\s*(.+)$/, (result, [text]) => {
            result.remoteMessages.all.push(text.trim());
            return false;
          }),
          ...remoteMessagesObjectParsers,
          new RemoteLineParser(
            [/create a (?:pull|merge) request/i, /\s(https?:\/\/\S+)$/],
            (result, [pullRequestUrl]) => {
              result.remoteMessages.pullRequestUrl = pullRequestUrl;
            }
          ),
          new RemoteLineParser(
            [/found (\d+) vulnerabilities.+\(([^)]+)\)/i, /\s(https?:\/\/\S+)$/],
            (result, [count, summary, url]) => {
              result.remoteMessages.vulnerabilities = {
                count: asNumber(count),
                summary,
                url
              };
            }
          )
        ];
        RemoteMessageSummary = class {
          constructor() {
            this.all = [];
          }
        };
      }
    });
    init_parse_pull = __esm2({
      "src/lib/parsers/parse-pull.ts"() {
        "use strict";
        init_PullSummary();
        init_utils();
        init_parse_remote_messages();
        FILE_UPDATE_REGEX = /^\s*(.+?)\s+\|\s+\d+\s*(\+*)(-*)/;
        SUMMARY_REGEX = /(\d+)\D+((\d+)\D+\(\+\))?(\D+(\d+)\D+\(-\))?/;
        ACTION_REGEX = /^(create|delete) mode \d+ (.+)/;
        parsers3 = [
          new LineParser(FILE_UPDATE_REGEX, (result, [file, insertions, deletions]) => {
            result.files.push(file);
            if (insertions) {
              result.insertions[file] = insertions.length;
            }
            if (deletions) {
              result.deletions[file] = deletions.length;
            }
          }),
          new LineParser(SUMMARY_REGEX, (result, [changes, , insertions, , deletions]) => {
            if (insertions !== void 0 || deletions !== void 0) {
              result.summary.changes = +changes || 0;
              result.summary.insertions = +insertions || 0;
              result.summary.deletions = +deletions || 0;
              return true;
            }
            return false;
          }),
          new LineParser(ACTION_REGEX, (result, [action, file]) => {
            append(result.files, file);
            append(action === "create" ? result.created : result.deleted, file);
          })
        ];
        errorParsers = [
          new LineParser(/^from\s(.+)$/i, (result, [remote]) => void (result.remote = remote)),
          new LineParser(/^fatal:\s(.+)$/, (result, [message]) => void (result.message = message)),
          new LineParser(
            /([a-z0-9]+)\.\.([a-z0-9]+)\s+(\S+)\s+->\s+(\S+)$/,
            (result, [hashLocal, hashRemote, branchLocal, branchRemote]) => {
              result.branch.local = branchLocal;
              result.hash.local = hashLocal;
              result.branch.remote = branchRemote;
              result.hash.remote = hashRemote;
            }
          )
        ];
        parsePullDetail = (stdOut, stdErr) => {
          return parseStringResponse(new PullSummary(), parsers3, [stdOut, stdErr]);
        };
        parsePullResult = (stdOut, stdErr) => {
          return Object.assign(
            new PullSummary(),
            parsePullDetail(stdOut, stdErr),
            parseRemoteMessages(stdOut, stdErr)
          );
        };
      }
    });
    init_parse_merge = __esm2({
      "src/lib/parsers/parse-merge.ts"() {
        "use strict";
        init_MergeSummary();
        init_utils();
        init_parse_pull();
        parsers4 = [
          new LineParser(/^Auto-merging\s+(.+)$/, (summary, [autoMerge]) => {
            summary.merges.push(autoMerge);
          }),
          new LineParser(/^CONFLICT\s+\((.+)\): Merge conflict in (.+)$/, (summary, [reason, file]) => {
            summary.conflicts.push(new MergeSummaryConflict(reason, file));
          }),
          new LineParser(
            /^CONFLICT\s+\((.+\/delete)\): (.+) deleted in (.+) and/,
            (summary, [reason, file, deleteRef]) => {
              summary.conflicts.push(new MergeSummaryConflict(reason, file, { deleteRef }));
            }
          ),
          new LineParser(/^CONFLICT\s+\((.+)\):/, (summary, [reason]) => {
            summary.conflicts.push(new MergeSummaryConflict(reason, null));
          }),
          new LineParser(/^Automatic merge failed;\s+(.+)$/, (summary, [result]) => {
            summary.result = result;
          })
        ];
        parseMergeResult = (stdOut, stdErr) => {
          return Object.assign(parseMergeDetail(stdOut, stdErr), parsePullResult(stdOut, stdErr));
        };
        parseMergeDetail = (stdOut) => {
          return parseStringResponse(new MergeSummaryDetail(), parsers4, stdOut);
        };
      }
    });
    init_merge = __esm2({
      "src/lib/tasks/merge.ts"() {
        "use strict";
        init_git_response_error();
        init_parse_merge();
        init_task();
      }
    });
    init_parse_push = __esm2({
      "src/lib/parsers/parse-push.ts"() {
        "use strict";
        init_utils();
        init_parse_remote_messages();
        parsers5 = [
          new LineParser(/^Pushing to (.+)$/, (result, [repo]) => {
            result.repo = repo;
          }),
          new LineParser(/^updating local tracking ref '(.+)'/, (result, [local]) => {
            result.ref = {
              ...result.ref || {},
              local
            };
          }),
          new LineParser(/^[=*-]\s+([^:]+):(\S+)\s+\[(.+)]$/, (result, [local, remote, type]) => {
            result.pushed.push(pushResultPushedItem(local, remote, type));
          }),
          new LineParser(
            /^Branch '([^']+)' set up to track remote branch '([^']+)' from '([^']+)'/,
            (result, [local, remote, remoteName]) => {
              result.branch = {
                ...result.branch || {},
                local,
                remote,
                remoteName
              };
            }
          ),
          new LineParser(
            /^([^:]+):(\S+)\s+([a-z0-9]+)\.\.([a-z0-9]+)$/,
            (result, [local, remote, from, to]) => {
              result.update = {
                head: {
                  local,
                  remote
                },
                hash: {
                  from,
                  to
                }
              };
            }
          )
        ];
        parsePushResult = (stdOut, stdErr) => {
          const pushDetail = parsePushDetail(stdOut, stdErr);
          const responseDetail = parseRemoteMessages(stdOut, stdErr);
          return {
            ...pushDetail,
            ...responseDetail
          };
        };
        parsePushDetail = (stdOut, stdErr) => {
          return parseStringResponse({ pushed: [] }, parsers5, [stdOut, stdErr]);
        };
      }
    });
    push_exports = {};
    __export2(push_exports, {
      pushTagsTask: () => pushTagsTask,
      pushTask: () => pushTask
    });
    init_push = __esm2({
      "src/lib/tasks/push.ts"() {
        "use strict";
        init_parse_push();
        init_utils();
      }
    });
    init_show = __esm2({
      "src/lib/tasks/show.ts"() {
        "use strict";
        init_utils();
        init_task();
      }
    });
    init_FileStatusSummary = __esm2({
      "src/lib/responses/FileStatusSummary.ts"() {
        "use strict";
        fromPathRegex = /^(.+)\0(.+)$/;
        FileStatusSummary = class {
          constructor(path, index, working_dir) {
            this.path = path;
            this.index = index;
            this.working_dir = working_dir;
            if (index === "R" || working_dir === "R") {
              const detail = fromPathRegex.exec(path) || [null, path, path];
              this.from = detail[2] || "";
              this.path = detail[1] || "";
            }
          }
        };
      }
    });
    init_StatusSummary = __esm2({
      "src/lib/responses/StatusSummary.ts"() {
        "use strict";
        init_utils();
        init_FileStatusSummary();
        StatusSummary = class {
          constructor() {
            this.not_added = [];
            this.conflicted = [];
            this.created = [];
            this.deleted = [];
            this.ignored = void 0;
            this.modified = [];
            this.renamed = [];
            this.files = [];
            this.staged = [];
            this.ahead = 0;
            this.behind = 0;
            this.current = null;
            this.tracking = null;
            this.detached = false;
            this.isClean = () => {
              return !this.files.length;
            };
          }
        };
        parsers6 = new Map([
          parser3(
            " ",
            "A",
            (result, file) => result.created.push(file)
          ),
          parser3(
            " ",
            "D",
            (result, file) => result.deleted.push(file)
          ),
          parser3(
            " ",
            "M",
            (result, file) => result.modified.push(file)
          ),
          parser3("A", " ", (result, file) => {
            result.created.push(file);
            result.staged.push(file);
          }),
          parser3("A", "M", (result, file) => {
            result.created.push(file);
            result.staged.push(file);
            result.modified.push(file);
          }),
          parser3("D", " ", (result, file) => {
            result.deleted.push(file);
            result.staged.push(file);
          }),
          parser3("M", " ", (result, file) => {
            result.modified.push(file);
            result.staged.push(file);
          }),
          parser3("M", "M", (result, file) => {
            result.modified.push(file);
            result.staged.push(file);
          }),
          parser3("R", " ", (result, file) => {
            result.renamed.push(renamedFile(file));
          }),
          parser3("R", "M", (result, file) => {
            const renamed = renamedFile(file);
            result.renamed.push(renamed);
            result.modified.push(renamed.to);
          }),
          parser3("!", "!", (_result, _file) => {
            (_result.ignored = _result.ignored || []).push(_file);
          }),
          parser3(
            "?",
            "?",
            (result, file) => result.not_added.push(file)
          ),
          ...conflicts(
            "A",
            "A",
            "U"
            /* UNMERGED */
          ),
          ...conflicts(
            "D",
            "D",
            "U"
            /* UNMERGED */
          ),
          ...conflicts(
            "U",
            "A",
            "D",
            "U"
            /* UNMERGED */
          ),
          [
            "##",
            (result, line) => {
              const aheadReg = /ahead (\d+)/;
              const behindReg = /behind (\d+)/;
              const currentReg = /^(.+?(?=(?:\.{3}|\s|$)))/;
              const trackingReg = /\.{3}(\S*)/;
              const onEmptyBranchReg = /\son\s(\S+?)(?=\.{3}|$)/;
              let regexResult = aheadReg.exec(line);
              result.ahead = regexResult && +regexResult[1] || 0;
              regexResult = behindReg.exec(line);
              result.behind = regexResult && +regexResult[1] || 0;
              regexResult = currentReg.exec(line);
              result.current = filterType(regexResult?.[1], filterString, null);
              regexResult = trackingReg.exec(line);
              result.tracking = filterType(regexResult?.[1], filterString, null);
              regexResult = onEmptyBranchReg.exec(line);
              if (regexResult) {
                result.current = filterType(regexResult?.[1], filterString, result.current);
              }
              result.detached = /\(no branch\)/.test(line);
            }
          ]
        ]);
        parseStatusSummary = function(text) {
          const lines = text.split(NULL);
          const status = new StatusSummary();
          for (let i2 = 0, l = lines.length; i2 < l; ) {
            let line = lines[i2++].trim();
            if (!line) {
              continue;
            }
            if (line.charAt(0) === "R") {
              line += NULL + (lines[i2++] || "");
            }
            splitLine(status, line);
          }
          return status;
        };
      }
    });
    init_status2 = __esm2({
      "src/lib/tasks/status.ts"() {
        "use strict";
        init_StatusSummary();
        ignoredOptions = ["--null", "-z"];
      }
    });
    init_version = __esm2({
      "src/lib/tasks/version.ts"() {
        "use strict";
        init_utils();
        NOT_INSTALLED = "installed=false";
        parsers7 = [
          new LineParser(
            /version (\d+)\.(\d+)\.(\d+)(?:\s*\((.+)\))?/,
            (result, [major, minor, patch, agent = ""]) => {
              Object.assign(
                result,
                versionResponse(asNumber(major), asNumber(minor), asNumber(patch), agent)
              );
            }
          ),
          new LineParser(
            /version (\d+)\.(\d+)\.(\D+)(.+)?$/,
            (result, [major, minor, patch, agent = ""]) => {
              Object.assign(result, versionResponse(asNumber(major), asNumber(minor), patch, agent));
            }
          )
        ];
      }
    });
    init_clone = __esm2({
      "src/lib/tasks/clone.ts"() {
        "use strict";
        init_task();
        init_utils();
        cloneTask = (repo, directory, customArgs) => {
          const commands = ["clone", ...customArgs];
          filterString(repo) && commands.push(c(repo));
          filterString(directory) && commands.push(c(directory));
          return straightThroughStringTask(commands);
        };
        cloneMirrorTask = (repo, directory, customArgs) => {
          append(customArgs, "--mirror");
          return cloneTask(repo, directory, customArgs);
        };
      }
    });
    simple_git_api_exports = {};
    __export2(simple_git_api_exports, {
      SimpleGitApi: () => SimpleGitApi
    });
    init_simple_git_api = __esm2({
      "src/lib/simple-git-api.ts"() {
        "use strict";
        init_task_callback();
        init_change_working_directory();
        init_checkout();
        init_count_objects();
        init_commit();
        init_config2();
        init_first_commit();
        init_grep();
        init_hash_object();
        init_init();
        init_log();
        init_merge();
        init_push();
        init_show();
        init_status2();
        init_task();
        init_version();
        init_utils();
        init_clone();
        SimpleGitApi = class {
          constructor(_executor) {
            this._executor = _executor;
          }
          _runTask(task, then) {
            const chain = this._executor.chain();
            const promise = chain.push(task);
            if (then) {
              taskCallback(task, promise, then);
            }
            return Object.create(this, {
              then: { value: promise.then.bind(promise) },
              catch: { value: promise.catch.bind(promise) },
              _executor: { value: chain }
            });
          }
          add(files) {
            return this._runTask(
              straightThroughStringTask(["add", ...asArray(files)]),
              trailingFunctionArgument(arguments)
            );
          }
          cwd(directory) {
            const next = trailingFunctionArgument(arguments);
            if (typeof directory === "string") {
              return this._runTask(changeWorkingDirectoryTask(directory, this._executor), next);
            }
            if (typeof directory?.path === "string") {
              return this._runTask(
                changeWorkingDirectoryTask(
                  directory.path,
                  directory.root && this._executor || void 0
                ),
                next
              );
            }
            return this._runTask(
              configurationErrorTask("Git.cwd: workingDirectory must be supplied as a string"),
              next
            );
          }
          hashObject(path, write) {
            return this._runTask(
              hashObjectTask(path, write === true),
              trailingFunctionArgument(arguments)
            );
          }
          init(bare) {
            return this._runTask(
              initTask(bare === true, this._executor.cwd, getTrailingOptions(arguments)),
              trailingFunctionArgument(arguments)
            );
          }
          merge() {
            return this._runTask(
              mergeTask(getTrailingOptions(arguments)),
              trailingFunctionArgument(arguments)
            );
          }
          mergeFromTo(remote, branch) {
            if (!(filterString(remote) && filterString(branch))) {
              return this._runTask(
                configurationErrorTask(
                  `Git.mergeFromTo requires that the 'remote' and 'branch' arguments are supplied as strings`
                )
              );
            }
            return this._runTask(
              mergeTask([remote, branch, ...getTrailingOptions(arguments)]),
              trailingFunctionArgument(arguments, false)
            );
          }
          outputHandler(handler) {
            this._executor.outputHandler = handler;
            return this;
          }
          push() {
            const task = pushTask(
              {
                remote: filterType(arguments[0], filterString),
                branch: filterType(arguments[1], filterString)
              },
              getTrailingOptions(arguments)
            );
            return this._runTask(task, trailingFunctionArgument(arguments));
          }
          stash() {
            return this._runTask(
              straightThroughStringTask(["stash", ...getTrailingOptions(arguments)]),
              trailingFunctionArgument(arguments)
            );
          }
          status() {
            return this._runTask(
              statusTask(getTrailingOptions(arguments)),
              trailingFunctionArgument(arguments)
            );
          }
        };
        Object.assign(
          SimpleGitApi.prototype,
          checkout_default(),
          clone_default(),
          commit_default(),
          config_default(),
          count_objects_default(),
          first_commit_default(),
          grep_default(),
          log_default(),
          show_default(),
          version_default()
        );
      }
    });
    scheduler_exports = {};
    __export2(scheduler_exports, {
      Scheduler: () => Scheduler
    });
    init_scheduler = __esm2({
      "src/lib/runners/scheduler.ts"() {
        "use strict";
        init_utils();
        init_git_logger();
        createScheduledTask = /* @__PURE__ */ (() => {
          let id = 0;
          return () => {
            id++;
            const { promise, done } = (0, import_promise_deferred.createDeferred)();
            return {
              promise,
              done,
              id
            };
          };
        })();
        Scheduler = class {
          constructor(concurrency = 2) {
            this.concurrency = concurrency;
            this.logger = createLogger("", "scheduler");
            this.pending = [];
            this.running = [];
            this.logger(`Constructed, concurrency=%s`, concurrency);
          }
          schedule() {
            if (!this.pending.length || this.running.length >= this.concurrency) {
              this.logger(
                `Schedule attempt ignored, pending=%s running=%s concurrency=%s`,
                this.pending.length,
                this.running.length,
                this.concurrency
              );
              return;
            }
            const task = append(this.running, this.pending.shift());
            this.logger(`Attempting id=%s`, task.id);
            task.done(() => {
              this.logger(`Completing id=`, task.id);
              remove(this.running, task);
              this.schedule();
            });
          }
          next() {
            const { promise, id } = append(this.pending, createScheduledTask());
            this.logger(`Scheduling id=%s`, id);
            this.schedule();
            return promise;
          }
        };
      }
    });
    apply_patch_exports = {};
    __export2(apply_patch_exports, {
      applyPatchTask: () => applyPatchTask
    });
    init_apply_patch = __esm2({
      "src/lib/tasks/apply-patch.ts"() {
        "use strict";
        init_task();
      }
    });
    init_BranchDeleteSummary = __esm2({
      "src/lib/responses/BranchDeleteSummary.ts"() {
        "use strict";
        BranchDeletionBatch = class {
          constructor() {
            this.all = [];
            this.branches = {};
            this.errors = [];
          }
          get success() {
            return !this.errors.length;
          }
        };
      }
    });
    init_parse_branch_delete = __esm2({
      "src/lib/parsers/parse-branch-delete.ts"() {
        "use strict";
        init_BranchDeleteSummary();
        init_utils();
        deleteSuccessRegex = /(\S+)\s+\(\S+\s([^)]+)\)/;
        deleteErrorRegex = /^error[^']+'([^']+)'/m;
        parsers8 = [
          new LineParser(deleteSuccessRegex, (result, [branch, hash]) => {
            const deletion = branchDeletionSuccess(branch, hash);
            result.all.push(deletion);
            result.branches[branch] = deletion;
          }),
          new LineParser(deleteErrorRegex, (result, [branch]) => {
            const deletion = branchDeletionFailure(branch);
            result.errors.push(deletion);
            result.all.push(deletion);
            result.branches[branch] = deletion;
          })
        ];
        parseBranchDeletions = (stdOut, stdErr) => {
          return parseStringResponse(new BranchDeletionBatch(), parsers8, [stdOut, stdErr]);
        };
      }
    });
    init_BranchSummary = __esm2({
      "src/lib/responses/BranchSummary.ts"() {
        "use strict";
        BranchSummaryResult = class {
          constructor() {
            this.all = [];
            this.branches = {};
            this.current = "";
            this.detached = false;
          }
          push(status, detached, name, commit, label) {
            if (status === "*") {
              this.detached = detached;
              this.current = name;
            }
            this.all.push(name);
            this.branches[name] = {
              current: status === "*",
              linkedWorkTree: status === "+",
              name,
              commit,
              label
            };
          }
        };
      }
    });
    init_parse_branch = __esm2({
      "src/lib/parsers/parse-branch.ts"() {
        "use strict";
        init_BranchSummary();
        init_utils();
        parsers9 = [
          new LineParser(
            /^([*+]\s)?\((?:HEAD )?detached (?:from|at) (\S+)\)\s+([a-z0-9]+)\s(.*)$/,
            (result, [current, name, commit, label]) => {
              result.push(branchStatus(current), true, name, commit, label);
            }
          ),
          new LineParser(
            /^([*+]\s)?(\S+)\s+([a-z0-9]+)\s?(.*)$/s,
            (result, [current, name, commit, label]) => {
              result.push(branchStatus(current), false, name, commit, label);
            }
          )
        ];
        currentBranchParser = new LineParser(/^(\S+)$/s, (result, [name]) => {
          result.push("*", false, name, "", "");
        });
      }
    });
    branch_exports = {};
    __export2(branch_exports, {
      branchLocalTask: () => branchLocalTask,
      branchTask: () => branchTask,
      containsDeleteBranchCommand: () => containsDeleteBranchCommand,
      deleteBranchTask: () => deleteBranchTask,
      deleteBranchesTask: () => deleteBranchesTask
    });
    init_branch = __esm2({
      "src/lib/tasks/branch.ts"() {
        "use strict";
        init_git_response_error();
        init_parse_branch_delete();
        init_parse_branch();
        init_utils();
      }
    });
    init_CheckIgnore = __esm2({
      "src/lib/responses/CheckIgnore.ts"() {
        "use strict";
        parseCheckIgnore = (text) => {
          return text.split(/\n/g).map(toPath).filter(Boolean);
        };
      }
    });
    check_ignore_exports = {};
    __export2(check_ignore_exports, {
      checkIgnoreTask: () => checkIgnoreTask
    });
    init_check_ignore = __esm2({
      "src/lib/tasks/check-ignore.ts"() {
        "use strict";
        init_CheckIgnore();
      }
    });
    init_parse_fetch = __esm2({
      "src/lib/parsers/parse-fetch.ts"() {
        "use strict";
        init_utils();
        parsers10 = [
          new LineParser(/From (.+)$/, (result, [remote]) => {
            result.remote = remote;
          }),
          new LineParser(/\* \[new branch]\s+(\S+)\s*-> (.+)$/, (result, [name, tracking]) => {
            result.branches.push({
              name,
              tracking
            });
          }),
          new LineParser(/\* \[new tag]\s+(\S+)\s*-> (.+)$/, (result, [name, tracking]) => {
            result.tags.push({
              name,
              tracking
            });
          }),
          new LineParser(/- \[deleted]\s+\S+\s*-> (.+)$/, (result, [tracking]) => {
            result.deleted.push({
              tracking
            });
          }),
          new LineParser(
            /\s*([^.]+)\.\.(\S+)\s+(\S+)\s*-> (.+)$/,
            (result, [from, to, name, tracking]) => {
              result.updated.push({
                name,
                tracking,
                to,
                from
              });
            }
          )
        ];
      }
    });
    fetch_exports = {};
    __export2(fetch_exports, {
      fetchTask: () => fetchTask
    });
    init_fetch = __esm2({
      "src/lib/tasks/fetch.ts"() {
        "use strict";
        init_parse_fetch();
        init_task();
      }
    });
    init_parse_move = __esm2({
      "src/lib/parsers/parse-move.ts"() {
        "use strict";
        init_utils();
        parsers11 = [
          new LineParser(/^Renaming (.+) to (.+)$/, (result, [from, to]) => {
            result.moves.push({ from, to });
          })
        ];
      }
    });
    move_exports = {};
    __export2(move_exports, {
      moveTask: () => moveTask
    });
    init_move = __esm2({
      "src/lib/tasks/move.ts"() {
        "use strict";
        init_parse_move();
        init_utils();
      }
    });
    pull_exports = {};
    __export2(pull_exports, {
      pullTask: () => pullTask
    });
    init_pull = __esm2({
      "src/lib/tasks/pull.ts"() {
        "use strict";
        init_git_response_error();
        init_parse_pull();
        init_utils();
      }
    });
    init_GetRemoteSummary = __esm2({
      "src/lib/responses/GetRemoteSummary.ts"() {
        "use strict";
        init_utils();
      }
    });
    remote_exports = {};
    __export2(remote_exports, {
      addRemoteTask: () => addRemoteTask,
      getRemotesTask: () => getRemotesTask,
      listRemotesTask: () => listRemotesTask,
      remoteTask: () => remoteTask,
      removeRemoteTask: () => removeRemoteTask
    });
    init_remote = __esm2({
      "src/lib/tasks/remote.ts"() {
        "use strict";
        init_GetRemoteSummary();
        init_task();
      }
    });
    stash_list_exports = {};
    __export2(stash_list_exports, {
      stashListTask: () => stashListTask
    });
    init_stash_list = __esm2({
      "src/lib/tasks/stash-list.ts"() {
        "use strict";
        init_log_format();
        init_parse_list_log_summary();
        init_diff();
        init_log();
      }
    });
    sub_module_exports = {};
    __export2(sub_module_exports, {
      addSubModuleTask: () => addSubModuleTask,
      initSubModuleTask: () => initSubModuleTask,
      subModuleTask: () => subModuleTask,
      updateSubModuleTask: () => updateSubModuleTask
    });
    init_sub_module = __esm2({
      "src/lib/tasks/sub-module.ts"() {
        "use strict";
        init_task();
      }
    });
    init_TagList = __esm2({
      "src/lib/responses/TagList.ts"() {
        "use strict";
        TagList = class {
          constructor(all, latest) {
            this.all = all;
            this.latest = latest;
          }
        };
        parseTagList = function(data, customSort = false) {
          const tags = data.split("\n").map(trimmed).filter(Boolean);
          if (!customSort) {
            tags.sort(function(tagA, tagB) {
              const partsA = tagA.split(".");
              const partsB = tagB.split(".");
              if (partsA.length === 1 || partsB.length === 1) {
                return singleSorted(toNumber(partsA[0]), toNumber(partsB[0]));
              }
              for (let i2 = 0, l = Math.max(partsA.length, partsB.length); i2 < l; i2++) {
                const diff = sorted(toNumber(partsA[i2]), toNumber(partsB[i2]));
                if (diff) {
                  return diff;
                }
              }
              return 0;
            });
          }
          const latest = customSort ? tags[0] : [...tags].reverse().find((tag) => tag.indexOf(".") >= 0);
          return new TagList(tags, latest);
        };
      }
    });
    tag_exports = {};
    __export2(tag_exports, {
      addAnnotatedTagTask: () => addAnnotatedTagTask,
      addTagTask: () => addTagTask,
      tagListTask: () => tagListTask
    });
    init_tag = __esm2({
      "src/lib/tasks/tag.ts"() {
        "use strict";
        init_TagList();
      }
    });
    require_git = __commonJS2({
      "src/git.js"(exports, module) {
        "use strict";
        var { GitExecutor: GitExecutor2 } = (init_git_executor(), __toCommonJS(git_executor_exports));
        var { SimpleGitApi: SimpleGitApi2 } = (init_simple_git_api(), __toCommonJS(simple_git_api_exports));
        var { Scheduler: Scheduler2 } = (init_scheduler(), __toCommonJS(scheduler_exports));
        var { adhocExecTask: adhocExecTask2, configurationErrorTask: configurationErrorTask2 } = (init_task(), __toCommonJS(task_exports));
        var {
          asArray: asArray2,
          filterArray: filterArray2,
          filterPrimitives: filterPrimitives2,
          filterString: filterString2,
          filterStringOrStringArray: filterStringOrStringArray2,
          filterType: filterType2,
          getTrailingOptions: getTrailingOptions2,
          trailingFunctionArgument: trailingFunctionArgument2,
          trailingOptionsArgument: trailingOptionsArgument2
        } = (init_utils(), __toCommonJS(utils_exports));
        var { applyPatchTask: applyPatchTask2 } = (init_apply_patch(), __toCommonJS(apply_patch_exports));
        var {
          branchTask: branchTask2,
          branchLocalTask: branchLocalTask2,
          deleteBranchesTask: deleteBranchesTask2,
          deleteBranchTask: deleteBranchTask2
        } = (init_branch(), __toCommonJS(branch_exports));
        var { checkIgnoreTask: checkIgnoreTask2 } = (init_check_ignore(), __toCommonJS(check_ignore_exports));
        var { checkIsRepoTask: checkIsRepoTask2 } = (init_check_is_repo(), __toCommonJS(check_is_repo_exports));
        var { cleanWithOptionsTask: cleanWithOptionsTask2, isCleanOptionsArray: isCleanOptionsArray2 } = (init_clean(), __toCommonJS(clean_exports));
        var { diffSummaryTask: diffSummaryTask2 } = (init_diff(), __toCommonJS(diff_exports));
        var { fetchTask: fetchTask2 } = (init_fetch(), __toCommonJS(fetch_exports));
        var { moveTask: moveTask2 } = (init_move(), __toCommonJS(move_exports));
        var { pullTask: pullTask2 } = (init_pull(), __toCommonJS(pull_exports));
        var { pushTagsTask: pushTagsTask2 } = (init_push(), __toCommonJS(push_exports));
        var {
          addRemoteTask: addRemoteTask2,
          getRemotesTask: getRemotesTask2,
          listRemotesTask: listRemotesTask2,
          remoteTask: remoteTask2,
          removeRemoteTask: removeRemoteTask2
        } = (init_remote(), __toCommonJS(remote_exports));
        var { getResetMode: getResetMode2, resetTask: resetTask2 } = (init_reset(), __toCommonJS(reset_exports));
        var { stashListTask: stashListTask2 } = (init_stash_list(), __toCommonJS(stash_list_exports));
        var {
          addSubModuleTask: addSubModuleTask2,
          initSubModuleTask: initSubModuleTask2,
          subModuleTask: subModuleTask2,
          updateSubModuleTask: updateSubModuleTask2
        } = (init_sub_module(), __toCommonJS(sub_module_exports));
        var { addAnnotatedTagTask: addAnnotatedTagTask2, addTagTask: addTagTask2, tagListTask: tagListTask2 } = (init_tag(), __toCommonJS(tag_exports));
        var { straightThroughBufferTask: straightThroughBufferTask2, straightThroughStringTask: straightThroughStringTask2 } = (init_task(), __toCommonJS(task_exports));
        function Git2(options, plugins) {
          this._plugins = plugins;
          this._executor = new GitExecutor2(
            options.baseDir,
            new Scheduler2(options.maxConcurrentProcesses),
            plugins
          );
          this._trimmed = options.trimmed;
        }
        (Git2.prototype = Object.create(SimpleGitApi2.prototype)).constructor = Git2;
        Git2.prototype.customBinary = function(command) {
          this._plugins.reconfigure("binary", command);
          return this;
        };
        Git2.prototype.env = function(name, value) {
          if (arguments.length === 1 && typeof name === "object") {
            this._executor.env = name;
          } else {
            (this._executor.env = this._executor.env || {})[name] = value;
          }
          return this;
        };
        Git2.prototype.stashList = function(options) {
          return this._runTask(
            stashListTask2(
              trailingOptionsArgument2(arguments) || {},
              filterArray2(options) && options || []
            ),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.mv = function(from, to) {
          return this._runTask(moveTask2(from, to), trailingFunctionArgument2(arguments));
        };
        Git2.prototype.checkoutLatestTag = function(then) {
          var git = this;
          return this.pull(function() {
            git.tags(function(err, tags) {
              git.checkout(tags.latest, then);
            });
          });
        };
        Git2.prototype.pull = function(remote, branch, options, then) {
          return this._runTask(
            pullTask2(
              filterType2(remote, filterString2),
              filterType2(branch, filterString2),
              getTrailingOptions2(arguments)
            ),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.fetch = function(remote, branch) {
          return this._runTask(
            fetchTask2(
              filterType2(remote, filterString2),
              filterType2(branch, filterString2),
              getTrailingOptions2(arguments)
            ),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.silent = function(silence) {
          return this._runTask(
            adhocExecTask2(
              () => console.warn(
                "simple-git deprecation notice: git.silent: logging should be configured using the `debug` library / `DEBUG` environment variable, this method will be removed."
              )
            )
          );
        };
        Git2.prototype.tags = function(options, then) {
          return this._runTask(
            tagListTask2(getTrailingOptions2(arguments)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.rebase = function() {
          return this._runTask(
            straightThroughStringTask2(["rebase", ...getTrailingOptions2(arguments)]),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.reset = function(mode) {
          return this._runTask(
            resetTask2(getResetMode2(mode), getTrailingOptions2(arguments)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.revert = function(commit) {
          const next = trailingFunctionArgument2(arguments);
          if (typeof commit !== "string") {
            return this._runTask(configurationErrorTask2("Commit must be a string"), next);
          }
          return this._runTask(
            straightThroughStringTask2(["revert", ...getTrailingOptions2(arguments, 0, true), commit]),
            next
          );
        };
        Git2.prototype.addTag = function(name) {
          const task = typeof name === "string" ? addTagTask2(name) : configurationErrorTask2("Git.addTag requires a tag name");
          return this._runTask(task, trailingFunctionArgument2(arguments));
        };
        Git2.prototype.addAnnotatedTag = function(tagName, tagMessage) {
          return this._runTask(
            addAnnotatedTagTask2(tagName, tagMessage),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.deleteLocalBranch = function(branchName, forceDelete, then) {
          return this._runTask(
            deleteBranchTask2(branchName, typeof forceDelete === "boolean" ? forceDelete : false),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.deleteLocalBranches = function(branchNames, forceDelete, then) {
          return this._runTask(
            deleteBranchesTask2(branchNames, typeof forceDelete === "boolean" ? forceDelete : false),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.branch = function(options, then) {
          return this._runTask(
            branchTask2(getTrailingOptions2(arguments)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.branchLocal = function(then) {
          return this._runTask(branchLocalTask2(), trailingFunctionArgument2(arguments));
        };
        Git2.prototype.raw = function(commands) {
          const createRestCommands = !Array.isArray(commands);
          const command = [].slice.call(createRestCommands ? arguments : commands, 0);
          for (let i2 = 0; i2 < command.length && createRestCommands; i2++) {
            if (!filterPrimitives2(command[i2])) {
              command.splice(i2, command.length - i2);
              break;
            }
          }
          command.push(...getTrailingOptions2(arguments, 0, true));
          var next = trailingFunctionArgument2(arguments);
          if (!command.length) {
            return this._runTask(
              configurationErrorTask2("Raw: must supply one or more command to execute"),
              next
            );
          }
          return this._runTask(straightThroughStringTask2(command, this._trimmed), next);
        };
        Git2.prototype.submoduleAdd = function(repo, path, then) {
          return this._runTask(addSubModuleTask2(repo, path), trailingFunctionArgument2(arguments));
        };
        Git2.prototype.submoduleUpdate = function(args, then) {
          return this._runTask(
            updateSubModuleTask2(getTrailingOptions2(arguments, true)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.submoduleInit = function(args, then) {
          return this._runTask(
            initSubModuleTask2(getTrailingOptions2(arguments, true)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.subModule = function(options, then) {
          return this._runTask(
            subModuleTask2(getTrailingOptions2(arguments)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.listRemote = function() {
          return this._runTask(
            listRemotesTask2(getTrailingOptions2(arguments)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.addRemote = function(remoteName, remoteRepo, then) {
          return this._runTask(
            addRemoteTask2(remoteName, remoteRepo, getTrailingOptions2(arguments)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.removeRemote = function(remoteName, then) {
          return this._runTask(removeRemoteTask2(remoteName), trailingFunctionArgument2(arguments));
        };
        Git2.prototype.getRemotes = function(verbose, then) {
          return this._runTask(getRemotesTask2(verbose === true), trailingFunctionArgument2(arguments));
        };
        Git2.prototype.remote = function(options, then) {
          return this._runTask(
            remoteTask2(getTrailingOptions2(arguments)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.tag = function(options, then) {
          const command = getTrailingOptions2(arguments);
          if (command[0] !== "tag") {
            command.unshift("tag");
          }
          return this._runTask(straightThroughStringTask2(command), trailingFunctionArgument2(arguments));
        };
        Git2.prototype.updateServerInfo = function(then) {
          return this._runTask(
            straightThroughStringTask2(["update-server-info"]),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.pushTags = function(remote, then) {
          const task = pushTagsTask2(
            { remote: filterType2(remote, filterString2) },
            getTrailingOptions2(arguments)
          );
          return this._runTask(task, trailingFunctionArgument2(arguments));
        };
        Git2.prototype.rm = function(files) {
          return this._runTask(
            straightThroughStringTask2(["rm", "-f", ...asArray2(files)]),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.rmKeepLocal = function(files) {
          return this._runTask(
            straightThroughStringTask2(["rm", "--cached", ...asArray2(files)]),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.catFile = function(options, then) {
          return this._catFile("utf-8", arguments);
        };
        Git2.prototype.binaryCatFile = function() {
          return this._catFile("buffer", arguments);
        };
        Git2.prototype._catFile = function(format, args) {
          var handler = trailingFunctionArgument2(args);
          var command = ["cat-file"];
          var options = args[0];
          if (typeof options === "string") {
            return this._runTask(
              configurationErrorTask2("Git.catFile: options must be supplied as an array of strings"),
              handler
            );
          }
          if (Array.isArray(options)) {
            command.push.apply(command, options);
          }
          const task = format === "buffer" ? straightThroughBufferTask2(command) : straightThroughStringTask2(command);
          return this._runTask(task, handler);
        };
        Git2.prototype.diff = function(options, then) {
          const task = filterString2(options) ? configurationErrorTask2(
            "git.diff: supplying options as a single string is no longer supported, switch to an array of strings"
          ) : straightThroughStringTask2(["diff", ...getTrailingOptions2(arguments)]);
          return this._runTask(task, trailingFunctionArgument2(arguments));
        };
        Git2.prototype.diffSummary = function() {
          return this._runTask(
            diffSummaryTask2(getTrailingOptions2(arguments, 1)),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.applyPatch = function(patches) {
          const task = !filterStringOrStringArray2(patches) ? configurationErrorTask2(
            `git.applyPatch requires one or more string patches as the first argument`
          ) : applyPatchTask2(asArray2(patches), getTrailingOptions2([].slice.call(arguments, 1)));
          return this._runTask(task, trailingFunctionArgument2(arguments));
        };
        Git2.prototype.revparse = function() {
          const commands = ["rev-parse", ...getTrailingOptions2(arguments, true)];
          return this._runTask(
            straightThroughStringTask2(commands, true),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.clean = function(mode, options, then) {
          const usingCleanOptionsArray = isCleanOptionsArray2(mode);
          const cleanMode = usingCleanOptionsArray && mode.join("") || filterType2(mode, filterString2) || "";
          const customArgs = getTrailingOptions2([].slice.call(arguments, usingCleanOptionsArray ? 1 : 0));
          return this._runTask(
            cleanWithOptionsTask2(cleanMode, customArgs),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.exec = function(then) {
          const task = {
            commands: [],
            format: "utf-8",
            parser() {
              if (typeof then === "function") {
                then();
              }
            }
          };
          return this._runTask(task);
        };
        Git2.prototype.clearQueue = function() {
          return this._runTask(
            adhocExecTask2(
              () => console.warn(
                "simple-git deprecation notice: clearQueue() is deprecated and will be removed, switch to using the abortPlugin instead."
              )
            )
          );
        };
        Git2.prototype.checkIgnore = function(pathnames, then) {
          return this._runTask(
            checkIgnoreTask2(asArray2(filterType2(pathnames, filterStringOrStringArray2, []))),
            trailingFunctionArgument2(arguments)
          );
        };
        Git2.prototype.checkIsRepo = function(checkType, then) {
          return this._runTask(
            checkIsRepoTask2(filterType2(checkType, filterString2)),
            trailingFunctionArgument2(arguments)
          );
        };
        module.exports = Git2;
      }
    });
    init_git_error();
    GitConstructError = class extends GitError {
      constructor(config, message) {
        super(void 0, message);
        this.config = config;
      }
    };
    init_git_error();
    init_git_error();
    GitPluginError = class extends GitError {
      constructor(task, plugin, message) {
        super(task, message);
        this.task = task;
        this.plugin = plugin;
        Object.setPrototypeOf(this, new.target.prototype);
      }
    };
    init_git_response_error();
    init_task_configuration_error();
    init_check_is_repo();
    init_clean();
    init_config2();
    init_diff_name_status();
    init_grep();
    init_reset();
    init_utils();
    init_utils();
    never = (0, import_promise_deferred2.deferred)().promise;
    init_utils();
    WRONG_NUMBER_ERR = `Invalid value supplied for custom binary, requires a single string or an array containing either one or two strings`;
    WRONG_CHARS_ERR = `Invalid value supplied for custom binary, restricted characters must be removed or supply the unsafe.allowUnsafeCustomBinary option`;
    init_git_error();
    init_utils();
    PluginStore = class {
      constructor() {
        this.plugins = /* @__PURE__ */ new Set();
        this.events = new EventEmitter();
      }
      on(type, listener) {
        this.events.on(type, listener);
      }
      reconfigure(type, data) {
        this.events.emit(type, data);
      }
      append(type, action) {
        const plugin = append(this.plugins, { type, action });
        return () => this.plugins.delete(plugin);
      }
      add(plugin) {
        const plugins = [];
        asArray(plugin).forEach((plugin2) => plugin2 && this.plugins.add(append(plugins, plugin2)));
        return () => {
          plugins.forEach((plugin2) => this.plugins.delete(plugin2));
        };
      }
      exec(type, data, context) {
        let output = data;
        const contextual = Object.freeze(Object.create(context));
        for (const plugin of this.plugins) {
          if (plugin.type === type) {
            output = plugin.action(output, contextual);
          }
        }
        return output;
      }
    };
    init_utils();
    init_utils();
    init_utils();
    Git = require_git();
    init_git_response_error();
    simpleGit = gitInstanceFactory;
  }
});

// src/_shared/project-identity.ts
import { spawnSync as spawnSync2 } from "node:child_process";
function canonicalProjectId(remoteUrl) {
  const s0 = (remoteUrl ?? "").trim();
  if (!s0) return null;
  let host;
  let path;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s0)) {
    let rest = s0.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "");
    rest = rest.replace(/^[^@/]+@/, "");
    const slash = rest.indexOf("/");
    if (slash < 0) return null;
    host = rest.slice(0, slash);
    path = rest.slice(slash + 1);
  } else {
    const m = s0.match(/^(?:[^@/]+@)?([^/:]+):(.+)$/);
    if (!m) return null;
    if (/^\d+$/.test(m[2].split("/")[0])) return null;
    host = m[1];
    path = m[2];
  }
  host = host.replace(/:\d+$/, "").toLowerCase();
  path = path.replace(/^\/+/, "").replace(/\/+$/, "").replace(/\.git$/i, "");
  if (!host || !path) return null;
  return `${host}/${path}`;
}
function projectSlugFromRemote(remoteUrl) {
  const id = canonicalProjectId(remoteUrl);
  if (!id) return null;
  return id.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function defaultGetRemoteSync(dir) {
  const r2 = spawnSync2("git", ["-C", dir, "config", "--get", "remote.origin.url"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 3e3
  });
  if (r2.status !== 0) return null;
  const v = (r2.stdout ?? "").trim();
  return v ? v : null;
}
function resolveProjectIdSync(cwdOrRoot, getRemote = defaultGetRemoteSync) {
  let remote = null;
  try {
    remote = getRemote(cwdOrRoot);
  } catch {
    remote = null;
  }
  const slug = projectSlugFromRemote(remote);
  if (slug) return { slug, source: "remote", canonical: canonicalProjectId(remote) };
  return { slug: projectSlugFromPath(cwdOrRoot), source: "path", canonical: null };
}
function cachedProjectSlug(dir) {
  const hit = _slugCache.get(dir);
  if (hit !== void 0) return hit;
  const slug = resolveProjectIdSync(dir).slug;
  _slugCache.set(dir, slug);
  return slug;
}
var _slugCache;
var init_project_identity = __esm({
  "src/_shared/project-identity.ts"() {
    "use strict";
    init_esm();
    init_slug();
    _slugCache = /* @__PURE__ */ new Map();
  }
});

// src/_shared/project-resolve.ts
function resolveProjectFromCwd(cwd, repoPath) {
  const indexFile = loadIndex(repoPath);
  return resolveProjectFromCwdWithIndex(cwd, indexFile.entries);
}
function resolveProjectFromCwdWithIndex(cwd, entries) {
  const candidates = [];
  const remoteSlug = resolveProjectIdSync(cwd).slug;
  candidates.push(remoteSlug);
  const pathSlug = projectSlugFromPath(cwd);
  if (pathSlug !== remoteSlug) candidates.push(pathSlug);
  for (const cand of candidates) {
    for (const e of Object.values(entries)) {
      if (e.project === cand) return cand;
    }
  }
  for (const e of Object.values(entries)) {
    if (e.projectRaw === cwd) return e.project;
  }
  return null;
}
var init_project_resolve = __esm({
  "src/_shared/project-resolve.ts"() {
    "use strict";
    init_index_store();
    init_slug();
    init_project_identity();
  }
});

// src/commands/prepare.ts
var prepare_exports = {};
__export(prepare_exports, {
  buildPreparePayload: () => buildPreparePayload,
  prepareCmd: () => prepareCmd
});
import { readFileSync as readFileSync8, existsSync as existsSync9 } from "node:fs";
import { join as join10 } from "node:path";
function buildPreparePayload(opts = {}) {
  const cfg = readPluginConfig();
  const indexFile = loadIndex(cfg.repoPath);
  let projectFilter = opts.project?.trim() || null;
  if (!projectFilter && opts.cwd) {
    projectFilter = resolveProjectFromCwdWithIndex(opts.cwd, indexFile.entries);
    if (!projectFilter) {
      throw new Error(
        `no synced sessions found for cwd '${opts.cwd}' (derived slug '${projectSlugFromPath(opts.cwd)}'). Run \`memarium sync\` first or pass --project explicitly.`
      );
    }
  }
  const consumed = consumedSessions(cfg.repoPath);
  const meta = {
    totalSessionsInIndex: 0,
    sessionsAlreadyDigested: 0,
    sessionsFilteredByProject: 0,
    sessionsFilteredAsPseudoProject: 0,
    sessionsFilteredAsMemariumMeta: 0,
    newSessionsCount: 0
  };
  const newSessions = [];
  const filteredMetaSessions = [];
  for (const entry of Object.values(indexFile.entries)) {
    meta.totalSessionsInIndex++;
    if (consumed.has(entry.sessionId)) {
      meta.sessionsAlreadyDigested++;
      continue;
    }
    if (!isRealProjectPath(entry.project)) {
      meta.sessionsFilteredAsPseudoProject++;
      continue;
    }
    if (projectFilter && entry.project !== projectFilter) {
      meta.sessionsFilteredByProject++;
      continue;
    }
    const mdRel = mdPathFor(entry);
    const mdAbs = join10(cfg.repoPath, mdRel);
    if (!existsSync9(mdAbs)) {
      continue;
    }
    const mdBody = readFileSync8(mdAbs, "utf8");
    if (isMemariumMetaSession(mdBody)) {
      meta.sessionsFilteredAsMemariumMeta++;
      filteredMetaSessions.push(entry.sessionId);
      continue;
    }
    const signals = extractSessionSignals(mdBody);
    newSessions.push({
      sessionId: entry.sessionId,
      shortId: entry.shortId,
      tool: entry.tool,
      project: entry.project,
      startedAt: entry.startedAt,
      endedAt: entry.endedAt,
      nameSlug: entry.nameSlug,
      displayName: entry.displayName,
      mdPath: mdRel,
      preview: signals.preview,
      insightScore: signals.insightScore
    });
  }
  newSessions.sort((a, b2) => a.endedAt < b2.endedAt ? -1 : a.endedAt > b2.endedAt ? 1 : 0);
  meta.newSessionsCount = newSessions.length;
  const existingEpisodes = {};
  for (const e of Object.values(loadMemoryIndex(cfg.repoPath).entries)) {
    if (!e || typeof e !== "object") continue;
    const ep = e;
    if (ep.type === "episodic" && ep.status === "active" && typeof ep.project === "string" && typeof ep.id === "string") {
      (existingEpisodes[ep.project] ??= []).push(ep.id);
    }
  }
  for (const list of Object.values(existingEpisodes)) list.sort();
  return {
    project: projectFilter,
    newSessions,
    existingEpisodes,
    filteredMetaSessions,
    meta
  };
}
function mdPathFor(entry) {
  return entry.relativePath.replace(/\.raw\.json(\.enc)?$/, `.md`);
}
async function prepareCmd(opts) {
  const payload = buildPreparePayload(opts);
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
var init_prepare = __esm({
  "src/commands/prepare.ts"() {
    "use strict";
    init_plugin_config();
    init_index_store();
    init_index_store2();
    init_consumed();
    init_session_signal();
    init_project_filter();
    init_slug();
    init_project_resolve();
  }
});

// node_modules/chalk/source/vendor/ansi-styles/index.js
function assembleStyles() {
  const codes = /* @__PURE__ */ new Map();
  for (const [groupName, group] of Object.entries(styles)) {
    for (const [styleName, style] of Object.entries(group)) {
      styles[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      };
      group[styleName] = styles[styleName];
      codes.set(style[0], style[1]);
    }
    Object.defineProperty(styles, groupName, {
      value: group,
      enumerable: false
    });
  }
  Object.defineProperty(styles, "codes", {
    value: codes,
    enumerable: false
  });
  styles.color.close = "\x1B[39m";
  styles.bgColor.close = "\x1B[49m";
  styles.color.ansi = wrapAnsi16();
  styles.color.ansi256 = wrapAnsi256();
  styles.color.ansi16m = wrapAnsi16m();
  styles.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);
  Object.defineProperties(styles, {
    rgbToAnsi256: {
      value(red, green, blue) {
        if (red === green && green === blue) {
          if (red < 8) {
            return 16;
          }
          if (red > 248) {
            return 231;
          }
          return Math.round((red - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
      },
      enumerable: false
    },
    hexToRgb: {
      value(hex) {
        const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches) {
          return [0, 0, 0];
        }
        let [colorString] = matches;
        if (colorString.length === 3) {
          colorString = [...colorString].map((character) => character + character).join("");
        }
        const integer = Number.parseInt(colorString, 16);
        return [
          /* eslint-disable no-bitwise */
          integer >> 16 & 255,
          integer >> 8 & 255,
          integer & 255
          /* eslint-enable no-bitwise */
        ];
      },
      enumerable: false
    },
    hexToAnsi256: {
      value: (hex) => styles.rgbToAnsi256(...styles.hexToRgb(hex)),
      enumerable: false
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8) {
          return 30 + code;
        }
        if (code < 16) {
          return 90 + (code - 8);
        }
        let red;
        let green;
        let blue;
        if (code >= 232) {
          red = ((code - 232) * 10 + 8) / 255;
          green = red;
          blue = red;
        } else {
          code -= 16;
          const remainder = code % 36;
          red = Math.floor(code / 36) / 5;
          green = Math.floor(remainder / 6) / 5;
          blue = remainder % 6 / 5;
        }
        const value = Math.max(red, green, blue) * 2;
        if (value === 0) {
          return 30;
        }
        let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
        if (value === 2) {
          result += 60;
        }
        return result;
      },
      enumerable: false
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles.ansi256ToAnsi(styles.rgbToAnsi256(red, green, blue)),
      enumerable: false
    },
    hexToAnsi: {
      value: (hex) => styles.ansi256ToAnsi(styles.hexToAnsi256(hex)),
      enumerable: false
    }
  });
  return styles;
}
var ANSI_BACKGROUND_OFFSET, wrapAnsi16, wrapAnsi256, wrapAnsi16m, styles, modifierNames, foregroundColorNames, backgroundColorNames, colorNames, ansiStyles, ansi_styles_default;
var init_ansi_styles = __esm({
  "node_modules/chalk/source/vendor/ansi-styles/index.js"() {
    ANSI_BACKGROUND_OFFSET = 10;
    wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`;
    wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`;
    wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
    styles = {
      modifier: {
        reset: [0, 0],
        // 21 isn't widely supported and 22 does the same thing
        bold: [1, 22],
        dim: [2, 22],
        italic: [3, 23],
        underline: [4, 24],
        overline: [53, 55],
        inverse: [7, 27],
        hidden: [8, 28],
        strikethrough: [9, 29]
      },
      color: {
        black: [30, 39],
        red: [31, 39],
        green: [32, 39],
        yellow: [33, 39],
        blue: [34, 39],
        magenta: [35, 39],
        cyan: [36, 39],
        white: [37, 39],
        // Bright color
        blackBright: [90, 39],
        gray: [90, 39],
        // Alias of `blackBright`
        grey: [90, 39],
        // Alias of `blackBright`
        redBright: [91, 39],
        greenBright: [92, 39],
        yellowBright: [93, 39],
        blueBright: [94, 39],
        magentaBright: [95, 39],
        cyanBright: [96, 39],
        whiteBright: [97, 39]
      },
      bgColor: {
        bgBlack: [40, 49],
        bgRed: [41, 49],
        bgGreen: [42, 49],
        bgYellow: [43, 49],
        bgBlue: [44, 49],
        bgMagenta: [45, 49],
        bgCyan: [46, 49],
        bgWhite: [47, 49],
        // Bright color
        bgBlackBright: [100, 49],
        bgGray: [100, 49],
        // Alias of `bgBlackBright`
        bgGrey: [100, 49],
        // Alias of `bgBlackBright`
        bgRedBright: [101, 49],
        bgGreenBright: [102, 49],
        bgYellowBright: [103, 49],
        bgBlueBright: [104, 49],
        bgMagentaBright: [105, 49],
        bgCyanBright: [106, 49],
        bgWhiteBright: [107, 49]
      }
    };
    modifierNames = Object.keys(styles.modifier);
    foregroundColorNames = Object.keys(styles.color);
    backgroundColorNames = Object.keys(styles.bgColor);
    colorNames = [...foregroundColorNames, ...backgroundColorNames];
    ansiStyles = assembleStyles();
    ansi_styles_default = ansiStyles;
  }
});

// node_modules/chalk/source/vendor/supports-color/index.js
import process2 from "node:process";
import os from "node:os";
import tty from "node:tty";
function hasFlag(flag, argv = globalThis.Deno ? globalThis.Deno.args : process2.argv) {
  const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
  const position = argv.indexOf(prefix + flag);
  const terminatorPosition = argv.indexOf("--");
  return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
}
function envForceColor() {
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      return 1;
    }
    if (env.FORCE_COLOR === "false") {
      return 0;
    }
    return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
  }
}
function translateLevel(level) {
  if (level === 0) {
    return false;
  }
  return {
    level,
    hasBasic: true,
    has256: level >= 2,
    has16m: level >= 3
  };
}
function _supportsColor(haveStream, { streamIsTTY, sniffFlags = true } = {}) {
  const noFlagForceColor = envForceColor();
  if (noFlagForceColor !== void 0) {
    flagForceColor = noFlagForceColor;
  }
  const forceColor = sniffFlags ? flagForceColor : noFlagForceColor;
  if (forceColor === 0) {
    return 0;
  }
  if (sniffFlags) {
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
      return 3;
    }
    if (hasFlag("color=256")) {
      return 2;
    }
  }
  if ("TF_BUILD" in env && "AGENT_NAME" in env) {
    return 1;
  }
  if (haveStream && !streamIsTTY && forceColor === void 0) {
    return 0;
  }
  const min = forceColor || 0;
  if (env.TERM === "dumb") {
    return min;
  }
  if (process2.platform === "win32") {
    const osRelease = os.release().split(".");
    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
      return Number(osRelease[2]) >= 14931 ? 3 : 2;
    }
    return 1;
  }
  if ("CI" in env) {
    if (["GITHUB_ACTIONS", "GITEA_ACTIONS", "CIRCLECI"].some((key) => key in env)) {
      return 3;
    }
    if (["TRAVIS", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
      return 1;
    }
    return min;
  }
  if ("TEAMCITY_VERSION" in env) {
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
  }
  if (env.COLORTERM === "truecolor") {
    return 3;
  }
  if (env.TERM === "xterm-kitty") {
    return 3;
  }
  if (env.TERM === "xterm-ghostty") {
    return 3;
  }
  if (env.TERM === "wezterm") {
    return 3;
  }
  if ("TERM_PROGRAM" in env) {
    const version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
    switch (env.TERM_PROGRAM) {
      case "iTerm.app": {
        return version >= 3 ? 3 : 2;
      }
      case "Apple_Terminal": {
        return 2;
      }
    }
  }
  if (/-256(color)?$/i.test(env.TERM)) {
    return 2;
  }
  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
    return 1;
  }
  if ("COLORTERM" in env) {
    return 1;
  }
  return min;
}
function createSupportsColor(stream, options = {}) {
  const level = _supportsColor(stream, {
    streamIsTTY: stream && stream.isTTY,
    ...options
  });
  return translateLevel(level);
}
var env, flagForceColor, supportsColor, supports_color_default;
var init_supports_color = __esm({
  "node_modules/chalk/source/vendor/supports-color/index.js"() {
    ({ env } = process2);
    if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
      flagForceColor = 0;
    } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
      flagForceColor = 1;
    }
    supportsColor = {
      stdout: createSupportsColor({ isTTY: tty.isatty(1) }),
      stderr: createSupportsColor({ isTTY: tty.isatty(2) })
    };
    supports_color_default = supportsColor;
  }
});

// node_modules/chalk/source/utilities.js
function stringReplaceAll(string, substring, replacer) {
  let index = string.indexOf(substring);
  if (index === -1) {
    return string;
  }
  const substringLength = substring.length;
  let endIndex = 0;
  let returnValue = "";
  do {
    returnValue += string.slice(endIndex, index) + substring + replacer;
    endIndex = index + substringLength;
    index = string.indexOf(substring, endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
function stringEncaseCRLFWithFirstIndex(string, prefix, postfix, index) {
  let endIndex = 0;
  let returnValue = "";
  do {
    const gotCR = string[index - 1] === "\r";
    returnValue += string.slice(endIndex, gotCR ? index - 1 : index) + prefix + (gotCR ? "\r\n" : "\n") + postfix;
    endIndex = index + 1;
    index = string.indexOf("\n", endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
var init_utilities = __esm({
  "node_modules/chalk/source/utilities.js"() {
  }
});

// node_modules/chalk/source/index.js
function createChalk(options) {
  return chalkFactory(options);
}
var stdoutColor, stderrColor, GENERATOR, STYLER, IS_EMPTY, levelMapping, styles2, applyOptions, chalkFactory, getModelAnsi, usedModels, proto, createStyler, createBuilder, applyStyle, chalk, chalkStderr, source_default;
var init_source = __esm({
  "node_modules/chalk/source/index.js"() {
    init_ansi_styles();
    init_supports_color();
    init_utilities();
    ({ stdout: stdoutColor, stderr: stderrColor } = supports_color_default);
    GENERATOR = Symbol("GENERATOR");
    STYLER = Symbol("STYLER");
    IS_EMPTY = Symbol("IS_EMPTY");
    levelMapping = [
      "ansi",
      "ansi",
      "ansi256",
      "ansi16m"
    ];
    styles2 = /* @__PURE__ */ Object.create(null);
    applyOptions = (object, options = {}) => {
      if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
        throw new Error("The `level` option should be an integer from 0 to 3");
      }
      const colorLevel = stdoutColor ? stdoutColor.level : 0;
      object.level = options.level === void 0 ? colorLevel : options.level;
    };
    chalkFactory = (options) => {
      const chalk2 = (...strings) => strings.join(" ");
      applyOptions(chalk2, options);
      Object.setPrototypeOf(chalk2, createChalk.prototype);
      return chalk2;
    };
    Object.setPrototypeOf(createChalk.prototype, Function.prototype);
    for (const [styleName, style] of Object.entries(ansi_styles_default)) {
      styles2[styleName] = {
        get() {
          const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
          Object.defineProperty(this, styleName, { value: builder });
          return builder;
        }
      };
    }
    styles2.visible = {
      get() {
        const builder = createBuilder(this, this[STYLER], true);
        Object.defineProperty(this, "visible", { value: builder });
        return builder;
      }
    };
    getModelAnsi = (model, level, type, ...arguments_) => {
      if (model === "rgb") {
        if (level === "ansi16m") {
          return ansi_styles_default[type].ansi16m(...arguments_);
        }
        if (level === "ansi256") {
          return ansi_styles_default[type].ansi256(ansi_styles_default.rgbToAnsi256(...arguments_));
        }
        return ansi_styles_default[type].ansi(ansi_styles_default.rgbToAnsi(...arguments_));
      }
      if (model === "hex") {
        return getModelAnsi("rgb", level, type, ...ansi_styles_default.hexToRgb(...arguments_));
      }
      return ansi_styles_default[type][model](...arguments_);
    };
    usedModels = ["rgb", "hex", "ansi256"];
    for (const model of usedModels) {
      styles2[model] = {
        get() {
          const { level } = this;
          return function(...arguments_) {
            const styler = createStyler(getModelAnsi(model, levelMapping[level], "color", ...arguments_), ansi_styles_default.color.close, this[STYLER]);
            return createBuilder(this, styler, this[IS_EMPTY]);
          };
        }
      };
      const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
      styles2[bgModel] = {
        get() {
          const { level } = this;
          return function(...arguments_) {
            const styler = createStyler(getModelAnsi(model, levelMapping[level], "bgColor", ...arguments_), ansi_styles_default.bgColor.close, this[STYLER]);
            return createBuilder(this, styler, this[IS_EMPTY]);
          };
        }
      };
    }
    proto = Object.defineProperties(() => {
    }, {
      ...styles2,
      level: {
        enumerable: true,
        get() {
          return this[GENERATOR].level;
        },
        set(level) {
          this[GENERATOR].level = level;
        }
      }
    });
    createStyler = (open, close, parent) => {
      let openAll;
      let closeAll;
      if (parent === void 0) {
        openAll = open;
        closeAll = close;
      } else {
        openAll = parent.openAll + open;
        closeAll = close + parent.closeAll;
      }
      return {
        open,
        close,
        openAll,
        closeAll,
        parent
      };
    };
    createBuilder = (self, _styler, _isEmpty) => {
      const builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
      Object.setPrototypeOf(builder, proto);
      builder[GENERATOR] = self;
      builder[STYLER] = _styler;
      builder[IS_EMPTY] = _isEmpty;
      return builder;
    };
    applyStyle = (self, string) => {
      if (self.level <= 0 || !string) {
        return self[IS_EMPTY] ? "" : string;
      }
      let styler = self[STYLER];
      if (styler === void 0) {
        return string;
      }
      const { openAll, closeAll } = styler;
      if (string.includes("\x1B")) {
        while (styler !== void 0) {
          string = stringReplaceAll(string, styler.close, styler.open);
          styler = styler.parent;
        }
      }
      const lfIndex = string.indexOf("\n");
      if (lfIndex !== -1) {
        string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
      }
      return openAll + string + closeAll;
    };
    Object.defineProperties(createChalk.prototype, styles2);
    chalk = createChalk();
    chalkStderr = createChalk({ level: stderrColor ? stderrColor.level : 0 });
    source_default = chalk;
  }
});

// src/_shared/git-ops.ts
import { existsSync as existsSync10, mkdirSync as mkdirSync7, readdirSync } from "node:fs";
import { homedir as homedir4 } from "node:os";
import { join as join11, resolve } from "node:path";
import { spawn as spawn2 } from "node:child_process";
function expandHome(p2) {
  if (p2 === "~") return homedir4();
  if (p2.startsWith("~/")) return join11(homedir4(), p2.slice(2));
  return p2;
}
function pushWithProgress(cwd, branch) {
  return new Promise((resolve9) => {
    const errBuf = [];
    let bufLen = 0;
    const p2 = spawn2(
      "git",
      ["push", "--progress", "--set-upstream", "origin", branch],
      { cwd, stdio: ["ignore", "inherit", "pipe"] }
    );
    p2.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      const s = chunk.toString();
      errBuf.push(s);
      bufLen += s.length;
      if (bufLen > 8192) {
        const drop = errBuf.shift();
        if (drop) bufLen -= drop.length;
      }
    });
    p2.on("error", () => resolve9({ ok: false, secretBlocked: false, stderrTail: errBuf.join("") }));
    p2.on("close", (code) => {
      const tail = errBuf.join("");
      resolve9({
        ok: code === 0,
        secretBlocked: code !== 0 && SECRET_BLOCK_RE.test(tail),
        stderrTail: tail.slice(-4096)
      });
    });
  });
}
async function fastForwardBranch(git, branch, onProgress) {
  let hasRemote = false;
  try {
    const remotes = await git.getRemotes(false);
    hasRemote = remotes.some((r2) => r2.name === "origin");
  } catch {
  }
  if (!hasRemote) return { pulled: false, reason: "no-remote" };
  onProgress?.(`git fetch origin...`);
  try {
    await git.fetch("origin", branch);
  } catch {
  }
  let hasUpstream = false;
  try {
    const refs = await git.branch(["-r"]);
    hasUpstream = refs.all.includes(`origin/${branch}`);
  } catch {
  }
  if (!hasUpstream) return { pulled: false, reason: "no-tracking" };
  onProgress?.(`git pull --rebase --autostash origin ${branch}...`);
  try {
    await git.raw(["pull", "--rebase", "--autostash", "origin", branch]);
    return { pulled: true };
  } catch (err) {
    try {
      await git.raw(["rebase", "--abort"]);
    } catch {
    }
    try {
      await git.raw(["stash", "pop"]);
    } catch {
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Could not fast-forward / rebase '${branch}' onto origin/${branch}. Resolve manually in the repo, then re-run. Original error:
${msg}`
    );
  }
}
async function ensureLocalRepo(localPath) {
  const path = resolve(expandHome(localPath));
  let initialized = false;
  if (!existsSync10(join11(path, ".git"))) {
    mkdirSync7(path, { recursive: true });
    const g = simpleGit(path);
    await g.init();
    const hasIdentity = await g.raw(["config", "user.email"]).then((s) => s.trim().length > 0).catch(() => false);
    if (!hasIdentity) {
      await g.addConfig("user.email", "memarium@localhost");
      await g.addConfig("user.name", "memarium");
    }
    initialized = true;
  }
  return { git: simpleGit(path), initialized, path };
}
async function commitWhitelist(git, repoPath, message, candidatePaths, opts, onProgress) {
  const existing = candidatePaths.filter((p2) => existsSync10(join11(repoPath, p2)));
  if (existing.length === 0) return { committed: false, pushed: false, staged: 0, branch: opts.branch };
  onProgress?.(`git add (${existing.length} whitelist paths)...`);
  await git.add(existing);
  const status = await git.status();
  const underWhitelist = (f) => existing.some((w) => {
    const ww = w.replace(/\/+$/, "");
    return f === ww || f.startsWith(ww + "/");
  });
  const stagedWhitelist = status.staged.filter(underWhitelist);
  if (stagedWhitelist.length === 0) return { committed: false, pushed: false, staged: 0, branch: opts.branch };
  onProgress?.(`git commit (${stagedWhitelist.length} whitelist paths)...`);
  await git.commit(message, existing);
  const staged = stagedWhitelist.length;
  if (!opts.push) return { committed: true, pushed: false, staged, branch: opts.branch };
  try {
    await fastForwardBranch(git, opts.branch, onProgress);
  } catch (e) {
    onProgress?.(`push skipped (could not sync): ${e.message}`);
    return { committed: true, pushed: false, staged, branch: opts.branch };
  }
  const cwd = await git.revparse(["--show-toplevel"]).then((s) => s.trim());
  const r2 = await pushWithProgress(cwd, opts.branch);
  return { committed: true, pushed: r2.ok, staged, branch: opts.branch };
}
var SECRET_BLOCK_RE;
var init_git_ops = __esm({
  "src/_shared/git-ops.ts"() {
    "use strict";
    init_esm();
    SECRET_BLOCK_RE = /GH013|push protection|secret-scanning/i;
  }
});

// src/commands/finalize.ts
var finalize_exports = {};
__export(finalize_exports, {
  finalizeCmd: () => finalizeCmd
});
async function finalizeCmd(opts = {}) {
  const cfg = readPluginConfig();
  try {
    const { git, initialized, path: repoPath } = await ensureLocalRepo(cfg.repoPath);
    let branch = cfg.deviceBranch || "main";
    try {
      const b2 = (await git.raw(["symbolic-ref", "--short", "HEAD"])).trim();
      if (b2) branch = b2;
    } catch {
    }
    let remote = !!cfg.repoUrl;
    if (remote) {
      try {
        const remotes = await git.getRemotes(false);
        remote = remotes.some((r3) => r3.name === "origin");
      } catch {
        remote = false;
      }
    }
    const r2 = await commitWhitelist(
      git,
      repoPath,
      "memarium: finalize digest (raw_sessions + memory)",
      WHITELIST,
      { push: remote && !opts.noPush, branch },
      (s) => console.error(source_default.gray(`  ${s}`))
    );
    return { initialized, committed: r2.committed, pushed: r2.pushed, staged: r2.staged, branch: r2.branch, remote };
  } catch (e) {
    console.error(source_default.red(`finalize: ${e instanceof Error ? e.message : String(e)}`));
    return { initialized: false, committed: false, pushed: false, staged: 0, branch: "", remote: false };
  }
}
var WHITELIST;
var init_finalize = __esm({
  "src/commands/finalize.ts"() {
    "use strict";
    init_source();
    init_plugin_config();
    init_git_ops();
    WHITELIST = [
      "raw_sessions",
      "memory",
      ".memarium/index.json",
      ".memarium/index.memory.json",
      ".memarium/index.entity.json",
      ".memarium/index.qa.json"
    ];
  }
});

// src/memory/render.ts
function arr(xs) {
  const a = xs ?? [];
  return a.length === 0 ? "[]" : `[${a.join(", ")}]`;
}
function nullable(v) {
  return v == null ? "null" : String(v);
}
function req(v, fallback) {
  if (v == null || v === "") return fallback;
  if (typeof v === "number" && !Number.isFinite(v)) return fallback;
  return String(v);
}
function renderMemoryMarkdown(entry, body) {
  const fm = [
    "---",
    `id: ${entry.id}`,
    `type: ${entry.type}`,
    `scope: ${entry.scope}`,
    `project: ${nullable(entry.project)}`,
    `title: ${entry.title}`,
    `summary: ${entry.summary ?? ""}`,
    `status: ${req(entry.status, "active")}`,
    `confidence: ${req(entry.confidence, "0.5")}`,
    `importance: ${req(entry.importance, "0")}`,
    `createdAt: ${req(entry.createdAt, "")}`,
    `updatedAt: ${req(entry.updatedAt, "")}`,
    `validFrom: ${nullable(entry.validFrom)}`,
    `validTo: ${nullable(entry.validTo)}`,
    `supersedes: ${nullable(entry.supersedes)}`,
    `originDevice: ${nullable(entry.originDevice)}`,
    `sourceSessions: ${arr(entry.sourceSessions)}`,
    `sourceCommits: ${arr(entry.sourceCommits)}`,
    `sourceFiles: ${arr(entry.sourceFiles)}`,
    `entities: ${arr(entry.entities)}`,
    `trust: ${entry.trust ?? "unknown"}`,
    "---"
  ].join("\n");
  const trimmedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  return `${fm}

# ${entry.title}

${trimmedBody}
`;
}
var init_render = __esm({
  "src/memory/render.ts"() {
    "use strict";
  }
});

// src/memory/gate.ts
function isGated(e) {
  if (!e || typeof e !== "object") return false;
  return e.type === "core" || e.type === "procedural" || e.status === "pinned";
}
function supersedesId(entry) {
  return typeof entry.supersedes === "string" && entry.supersedes.length > 0 ? entry.supersedes : null;
}
function isTrustElevation(entry, live) {
  if ((entry.trust ?? "unknown") !== "trusted") return false;
  const prev = live[entry.id];
  if (!prev) return false;
  return (prev.trust ?? "unknown") !== "trusted";
}
function isGatedChange(entry, live) {
  if (isGated(entry)) return true;
  if (isGated(live[entry.id])) return true;
  const sup = supersedesId(entry);
  if (sup && isGated(live[sup])) return true;
  if (isTrustElevation(entry, live)) return true;
  return false;
}
function targetKey(entry) {
  return supersedesId(entry) ?? entry.id;
}
function deriveAction(entry, live) {
  const sup = supersedesId(entry);
  if (sup && live[sup]) return "replace";
  if (live[entry.id]) return "update";
  return "create";
}
function isSafePathSegment(seg) {
  return seg.length > 0 && seg !== "." && !seg.includes("/") && !seg.includes("\\") && !seg.includes("..") && !seg.includes("\0");
}
function safeSegment(seg, label) {
  if (!isSafePathSegment(seg)) {
    throw new Error(`memory path: unsafe ${label} segment ${JSON.stringify(seg)}`);
  }
  return seg;
}
function canonicalMemoryPath(entry) {
  if (!MEMORY_TYPES.has(entry.type)) {
    throw new Error(`memory path: invalid type ${JSON.stringify(entry.type)} (not a MemoryType)`);
  }
  const scopeDir = safeSegment(entry.project ?? "_global", "project");
  const slug = safeSegment(entry.id.split("/").pop() ?? entry.id, "slug");
  return `memory/${entry.type}/${scopeDir}/${slug}.md`;
}
var MEMORY_TYPES;
var init_gate = __esm({
  "src/memory/gate.ts"() {
    "use strict";
    MEMORY_TYPES = /* @__PURE__ */ new Set([
      "core",
      "semantic",
      "episodic",
      "procedural"
    ]);
  }
});

// src/qa/path-guard.ts
import { lstatSync } from "node:fs";
import { join as join12, relative, sep } from "node:path";
function assertNoSymlinkedComponent(repoPath, targetAbs, label) {
  const rel = relative(repoPath, targetAbs);
  if (rel === "" || rel === ".." || rel.startsWith(".." + sep)) return;
  let cur = repoPath;
  for (const seg of rel.split(sep)) {
    if (!seg) continue;
    cur = join12(cur, seg);
    let st;
    try {
      st = lstatSync(cur);
    } catch (e) {
      if (e.code === "ENOENT") return;
      throw e;
    }
    if (st.isSymbolicLink()) {
      throw new Error(`${label}: refusing to operate through a symlinked path component (symlink guard): ${seg}`);
    }
  }
}
var init_path_guard = __esm({
  "src/qa/path-guard.ts"() {
    "use strict";
  }
});

// src/memory/apply.ts
import { existsSync as existsSync11, mkdirSync as mkdirSync8, readFileSync as readFileSync9, writeFileSync as writeFileSync7 } from "node:fs";
import { dirname as dirname4, join as join13, resolve as resolve2, sep as sep2 } from "node:path";
function normalizeRel(p2) {
  return p2.split("\\").join("/");
}
function applyMemoryItems(repoPath, items) {
  const idx = loadMemoryIndex(repoPath);
  const memRoot = resolve2(join13(repoPath, "memory"));
  const willExist = { ...idx.entries };
  const planned = [];
  for (const { entry, body } of items) {
    const canonical = canonicalMemoryPath(entry);
    if (entry.path && normalizeRel(entry.path) !== canonical) {
      throw new Error(
        `memory apply: entry.path "${entry.path}" does not match canonical path for ${entry.id} ("${canonical}")`
      );
    }
    const abs = resolve2(join13(repoPath, canonical));
    if (abs !== memRoot && !abs.startsWith(memRoot + sep2)) {
      throw new Error(`memory apply: refusing to write outside memory/: ${canonical}`);
    }
    assertNoSymlinkedComponent(repoPath, abs, "memory apply");
    let supersede = null;
    const sup = supersedesId(entry);
    if (sup && willExist[sup]) {
      const target = willExist[sup];
      const tabs = resolve2(join13(repoPath, canonicalMemoryPath(target)));
      let mdPath = null;
      if (tabs === memRoot || tabs.startsWith(memRoot + sep2)) {
        assertNoSymlinkedComponent(repoPath, tabs, "memory apply");
        mdPath = tabs;
      }
      supersede = { targetId: sup, mdPath };
    }
    planned.push({ entry, body, canonical, abs, supersede });
    willExist[entry.id] = entry;
  }
  let written = 0, superseded = 0;
  const paths = [];
  for (const { entry, body, canonical, abs, supersede } of planned) {
    entry.path = canonical;
    if (typeof entry.accessCount !== "number" || !isFinite(entry.accessCount)) entry.accessCount = 0;
    if (entry.lastAccess === void 0) entry.lastAccess = null;
    const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);
    const fallbackDate = isDate(entry.validFrom) ? entry.validFrom.slice(0, 10) : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (!isDate(entry.createdAt)) entry.createdAt = fallbackDate;
    if (!isDate(entry.updatedAt)) entry.updatedAt = fallbackDate;
    if (entry.trust !== "trusted" && entry.trust !== "untrusted") entry.trust = "unknown";
    if (entry.status !== "active" && entry.status !== "superseded" && entry.status !== "pinned") {
      entry.status = "active";
    }
    if (entry.supersedes === void 0) entry.supersedes = null;
    if (entry.validFrom === void 0) entry.validFrom = null;
    if (entry.validTo === void 0) entry.validTo = null;
    if (entry.originDevice === void 0) entry.originDevice = null;
    if (entry.project === void 0) entry.project = null;
    if (typeof entry.confidence !== "number" || !isFinite(entry.confidence)) entry.confidence = 0.5;
    if (typeof entry.importance !== "number" || !isFinite(entry.importance)) entry.importance = 0;
    if (typeof entry.summary !== "string") entry.summary = "";
    if (!Array.isArray(entry.sourceSessions)) entry.sourceSessions = [];
    if (!Array.isArray(entry.sourceCommits)) entry.sourceCommits = [];
    if (!Array.isArray(entry.sourceFiles)) entry.sourceFiles = [];
    if (!Array.isArray(entry.entities)) entry.entities = [];
    const prior = idx.entries[entry.id];
    if (prior) {
      const uni = (next, prev) => Array.from(/* @__PURE__ */ new Set([...Array.isArray(prev) ? prev : [], ...next]));
      entry.sourceSessions = uni(entry.sourceSessions, prior.sourceSessions);
      entry.sourceFiles = uni(entry.sourceFiles, prior.sourceFiles);
      entry.sourceCommits = uni(entry.sourceCommits, prior.sourceCommits);
    }
    if (supersede && idx.entries[supersede.targetId]) {
      idx.entries[supersede.targetId].status = "superseded";
      superseded++;
      if (supersede.mdPath && existsSync11(supersede.mdPath)) {
        const md = readFileSync9(supersede.mdPath, "utf8").replace(/^status: .*$/m, "status: superseded");
        writeFileSync7(supersede.mdPath, md);
      }
    }
    mkdirSync8(dirname4(abs), { recursive: true });
    writeFileSync7(abs, renderMemoryMarkdown(entry, body));
    upsertMemory(idx, entry);
    written++;
    paths.push(canonical);
  }
  saveMemoryIndex(repoPath, idx);
  return { written, superseded, paths };
}
var init_apply = __esm({
  "src/memory/apply.ts"() {
    "use strict";
    init_index_store2();
    init_render();
    init_gate();
    init_path_guard();
  }
});

// src/commands/memory-write.ts
var memory_write_exports = {};
__export(memory_write_exports, {
  memoryWriteCmd: () => memoryWriteCmd
});
import { existsSync as existsSync12, readFileSync as readFileSync10 } from "node:fs";
async function memoryWriteCmd(opts) {
  if (!opts.inputPath || !existsSync12(opts.inputPath)) {
    throw new Error(`memory-write: --input JSON not found: ${opts.inputPath}`);
  }
  const items = JSON.parse(readFileSync10(opts.inputPath, "utf8"));
  const cfg = readPluginConfig();
  const idx = loadMemoryIndex(cfg.repoPath);
  for (const { entry } of items) {
    if (isGatedChange(entry, idx.entries)) {
      throw new Error(
        `memory-write: refusing gated change targeting "${targetKey(entry)}" (core/procedural/pinned, or it edits/supersedes one) \u2014 use memory-propose`
      );
    }
  }
  return applyMemoryItems(cfg.repoPath, items);
}
var init_memory_write = __esm({
  "src/commands/memory-write.ts"() {
    "use strict";
    init_plugin_config();
    init_index_store2();
    init_apply();
    init_gate();
  }
});

// src/memory/parse.ts
function parseArr(v) {
  const t2 = (v ?? "").trim();
  if (t2 === "[]" || t2 === "" || t2 === "undefined" || t2 === "null") return [];
  return t2.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
}
function parseScalar(v) {
  const t2 = (v ?? "").trim();
  return t2 === "null" || t2 === "undefined" || t2 === "" ? null : t2;
}
function parseDate(v) {
  const t2 = (v ?? "").trim();
  return t2 === "undefined" || t2 === "null" ? "" : t2;
}
function parseNum(v, fallback) {
  const t2 = (v ?? "").trim();
  if (t2 === "" || t2 === "undefined" || t2 === "null") return fallback;
  const n = Number(t2);
  return Number.isFinite(n) ? n : fallback;
}
function coerceTrust(v) {
  const t2 = v.trim();
  return t2 === "trusted" || t2 === "untrusted" ? t2 : "unknown";
}
function deriveLegacyTrust(sourceSessions, sourceCommits, scope, project) {
  const ownProvenance = sourceSessions.length > 0 || sourceCommits.length > 0;
  const projectScoped = scope === "global" || scope === "user" || project !== null;
  return ownProvenance && projectScoped ? "trusted" : "unknown";
}
function parseMemoryMarkdown(md) {
  md = md.replace(/\r\n/g, "\n");
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const i2 = line.indexOf(":");
    if (i2 === -1) continue;
    fm[line.slice(0, i2).trim()] = line.slice(i2 + 1).trim();
  }
  if (!fm.id || !fm.type) return null;
  const scope = fm.scope;
  const project = parseScalar(fm.project);
  const sourceSessions = parseArr(fm.sourceSessions ?? "[]");
  const sourceCommits = parseArr(fm.sourceCommits ?? "[]");
  const trust = fm.trust !== void 0 ? coerceTrust(fm.trust) : deriveLegacyTrust(sourceSessions, sourceCommits, scope, project);
  const statusRaw = (fm.status ?? "").trim();
  const status = statusRaw === "" || statusRaw === "undefined" || statusRaw === "null" ? "active" : statusRaw;
  return {
    id: fm.id,
    type: fm.type,
    scope,
    project,
    title: fm.title ?? "",
    summary: fm.summary ?? "",
    path: "",
    // filled by caller from the file path
    status,
    confidence: parseNum(fm.confidence, 0.5),
    importance: parseNum(fm.importance, 0),
    createdAt: parseDate(fm.createdAt),
    updatedAt: parseDate(fm.updatedAt),
    validFrom: parseScalar(fm.validFrom ?? "null"),
    validTo: parseScalar(fm.validTo ?? "null"),
    sourceSessions,
    sourceCommits,
    sourceFiles: parseArr(fm.sourceFiles ?? "[]"),
    supersedes: parseScalar(fm.supersedes ?? "null"),
    entities: parseArr(fm.entities ?? "[]"),
    trust,
    originDevice: parseScalar(fm.originDevice ?? "null"),
    accessCount: 0,
    lastAccess: null
  };
}
var init_parse = __esm({
  "src/memory/parse.ts"() {
    "use strict";
  }
});

// src/_shared/heal-frontmatter.ts
function healUndefinedFrontmatter(md, fallbackDate) {
  const m = md.match(/^(---\r?\n)([\s\S]*?)(\r?\n---)/);
  if (!m) return null;
  const before = m[2];
  const after = before.replace(/^(project|validFrom|validTo|supersedes|originDevice|relatedTo):[ \t]*undefined[ \t]*(\r?)$/gm, "$1: null$2").replace(/^status:[ \t]*undefined[ \t]*(\r?)$/gm, "status: active$1").replace(/^confidence:[ \t]*(?:undefined|null)[ \t]*(\r?)$/gm, "confidence: 0.5$1").replace(/^importance:[ \t]*(?:undefined|null)[ \t]*(\r?)$/gm, "importance: 0$1").replace(/^(sourceSessions|sourceCommits|sourceFiles|entities|aliases|sourceMemoryIds|relatedEntities|tags|sources):[ \t]*undefined[ \t]*(\r?)$/gm, "$1: []$2").replace(/^(createdAt|updatedAt):[ \t]*(?:undefined|null)[ \t]*(\r?)$/gm, `$1: ${fallbackDate}$2`);
  if (after === before) return null;
  return m[1] + after + m[3] + md.slice(m[0].length);
}
var init_heal_frontmatter = __esm({
  "src/_shared/heal-frontmatter.ts"() {
    "use strict";
  }
});

// src/commands/memory-index.ts
var memory_index_exports = {};
__export(memory_index_exports, {
  memoryIndexCmd: () => memoryIndexCmd
});
import { existsSync as existsSync13, readFileSync as readFileSync11, readdirSync as readdirSync2, writeFileSync as writeFileSync8, statSync } from "node:fs";
import { join as join14, relative as relative2 } from "node:path";
function walkMd(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = readdirSync2(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p2 = join14(cur, e.name);
      if (e.isDirectory()) stack.push(p2);
      else if (e.isFile() && e.name.endsWith(".md")) out.push(p2);
    }
  }
  return out;
}
async function memoryIndexCmd() {
  const cfg = readPluginConfig();
  const memRoot = join14(cfg.repoPath, "memory");
  const idx = emptyMemoryIndex();
  let indexed = 0;
  let healed = 0;
  assertNoSymlinkedComponent(cfg.repoPath, memRoot, "memory-index");
  if (existsSync13(memRoot)) {
    for (const abs of walkMd(memRoot)) {
      if (abs.includes(`${join14("memory", "_primer")}/`)) continue;
      let md = readFileSync11(abs, "utf8");
      const mtimeDate = new Date(statSync(abs).mtimeMs).toISOString().slice(0, 10);
      const fixed = healUndefinedFrontmatter(md, mtimeDate);
      if (fixed !== null) {
        writeFileSync8(abs, fixed);
        md = fixed;
        healed++;
      }
      const entry = parseMemoryMarkdown(md);
      if (!entry) continue;
      entry.path = relative2(cfg.repoPath, abs);
      upsertMemory(idx, entry);
      indexed++;
    }
  }
  saveMemoryIndex(cfg.repoPath, idx);
  return { indexed, healed };
}
var init_memory_index = __esm({
  "src/commands/memory-index.ts"() {
    "use strict";
    init_plugin_config();
    init_types2();
    init_index_store2();
    init_parse();
    init_heal_frontmatter();
    init_path_guard();
  }
});

// src/commands/skip-write.ts
var skip_write_exports = {};
__export(skip_write_exports, {
  skipWriteCmd: () => skipWriteCmd
});
import { readFileSync as readFileSync12 } from "node:fs";
async function skipWriteCmd(opts) {
  if (!opts.inputPath) throw new Error("skip-write requires --input <path>");
  const cfg = readPluginConfig();
  const idx = loadSkips(cfg.repoPath);
  const raw = JSON.parse(readFileSync12(opts.inputPath, "utf8"));
  const sessions = Array.isArray(raw) ? raw : Array.isArray(raw?.sessions) ? raw.sessions : null;
  if (sessions === null) {
    throw new Error("skip-write: --input must be an array of {sessionId,reason?} or {sessions:[...]}");
  }
  for (const s of sessions) {
    if (!s || typeof s.sessionId !== "string" || s.reason !== void 0 && typeof s.reason !== "string") {
      throw new Error("skip-write: each item must be { sessionId: string, reason?: string }");
    }
  }
  const at = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const added = upsertSkips(idx, sessions, at);
  saveSkips(cfg.repoPath, idx);
  return { skipped: added, total: Object.keys(idx.sessions).length };
}
var init_skip_write = __esm({
  "src/commands/skip-write.ts"() {
    "use strict";
    init_plugin_config();
    init_skip_store();
  }
});

// src/memory/score.ts
function tokenize(s) {
  return s.toLowerCase().split(/[^a-z0-9_]+/).filter((t2) => t2.length > 1);
}
function num(v, dflt = 0) {
  return typeof v === "number" && isFinite(v) ? v : dflt;
}
function isEligible(e, q2) {
  if (e.status === "superseded") return false;
  if (e.validTo !== null && e.validTo <= q2.now) return false;
  if (q2.type && e.type !== q2.type) return false;
  if (e.scope === "global" || e.scope === "user") return true;
  if (q2.project && e.scope === `project:${q2.project}`) return true;
  return q2.project === null;
}
function scoreMemories(entries, q2) {
  const qTokens = new Set(tokenize(q2.text));
  const out = [];
  for (const e of entries) {
    if (!isEligible(e, q2)) continue;
    let score = 0;
    const why = [];
    if (qTokens.size > 0) {
      const haystack = new Set(tokenize(`${e.title} ${e.summary} ${e.entities.join(" ")}`));
      let hits = 0;
      for (const t2 of qTokens) if (haystack.has(t2)) hits++;
      if (hits > 0) {
        score += hits * 5;
        why.push(`keyword\xD7${hits}`);
      }
    }
    if (q2.project && e.scope === `project:${q2.project}`) {
      score += 4;
      why.push("scope:project");
    }
    if (e.scope === "global" || e.scope === "user") {
      score += 2;
      why.push(`scope:${e.scope}`);
    }
    if (e.status === "pinned") {
      score += 3;
      why.push("pinned");
    }
    const qf = new Set(q2.files ?? []);
    const fileHit = e.sourceFiles.filter((f) => qf.has(f)).length;
    if (fileHit > 0) {
      score += fileHit * 3;
      why.push(`file\xD7${fileHit}`);
    }
    const qc = new Set(q2.commits ?? []);
    const commitHit = e.sourceCommits.filter((c3) => qc.has(c3)).length;
    if (commitHit > 0) {
      score += commitHit * 3;
      why.push(`commit\xD7${commitHit}`);
    }
    score += recencyBoost(e.updatedAt, q2.now);
    const importance = num(e.importance);
    score += Math.min(importance, IMPORTANCE_CAP);
    score += Math.min(num(e.accessCount), 5) * 0.5;
    if (importance >= 3) why.push(`importance:${importance}`);
    out.push({ entry: e, score, whyRecalled: why.join(" ") || "scope-eligible" });
  }
  out.sort((a, b2) => b2.score - a.score || a.entry.id.localeCompare(b2.entry.id));
  return out;
}
function recencyBoost(updatedAt, now) {
  const days = (Date.parse(now) - Date.parse(updatedAt)) / 864e5;
  if (!isFinite(days)) return 0;
  if (days <= 7) return 2;
  if (days <= 30) return 1;
  return 0;
}
var IMPORTANCE_CAP;
var init_score = __esm({
  "src/memory/score.ts"() {
    "use strict";
    IMPORTANCE_CAP = 3;
  }
});

// src/memory/usage-store.ts
import { createHash } from "node:crypto";
import { existsSync as existsSync14, mkdirSync as mkdirSync9, readFileSync as readFileSync13, renameSync as renameSync2, writeFileSync as writeFileSync9 } from "node:fs";
import { homedir as homedir5 } from "node:os";
import { join as join15, resolve as resolve3 } from "node:path";
function memariumHome() {
  return join15(homedir5(), ".memarium");
}
function usageDir(repoPath) {
  const repoHash = createHash("sha256").update(resolve3(repoPath)).digest("hex").slice(0, 12);
  return join15(memariumHome(), "usage", repoHash);
}
function usageFile(repoPath) {
  return join15(usageDir(repoPath), "access.json");
}
function guardUsagePath(targetAbs) {
  assertNoSymlinkedComponent(memariumHome(), targetAbs, "usage-store");
}
function loadUsage(repoPath) {
  let file;
  try {
    file = usageFile(repoPath);
  } catch {
    return {};
  }
  try {
    guardUsagePath(file);
  } catch {
    return {};
  }
  if (!existsSync14(file)) return {};
  let parsed;
  try {
    parsed = JSON.parse(readFileSync13(file, "utf8"));
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out = {};
  for (const [id, v] of Object.entries(parsed)) {
    if (!v || typeof v !== "object") continue;
    const count = v.count;
    const lastAccess = v.lastAccess;
    if (typeof count === "number" && isFinite(count)) {
      out[id] = {
        count: Math.max(0, Math.floor(count)),
        lastAccess: typeof lastAccess === "string" ? lastAccess : ""
      };
    }
  }
  return out;
}
function saveUsage(repoPath, usage) {
  const dir = usageDir(repoPath);
  guardUsagePath(dir);
  mkdirSync9(dir, { recursive: true });
  const file = usageFile(repoPath);
  const tmp = join15(dir, `access.json.tmp-${process.pid}`);
  writeFileSync9(tmp, JSON.stringify(usage, null, 2) + "\n");
  renameSync2(tmp, file);
}
function bumpUsage(repoPath, ids, now) {
  if (ids.length === 0) return;
  const usage = loadUsage(repoPath);
  for (const id of new Set(ids)) {
    const rec = usage[id] ?? { count: 0, lastAccess: "" };
    rec.count += 1;
    rec.lastAccess = now;
    usage[id] = rec;
  }
  saveUsage(repoPath, usage);
}
function overlayUsage(entries, usage) {
  for (const e of entries) {
    const rec = usage[e.id];
    if (rec) {
      e.accessCount = rec.count;
      if (rec.lastAccess) e.lastAccess = rec.lastAccess;
    }
  }
}
var init_usage_store = __esm({
  "src/memory/usage-store.ts"() {
    "use strict";
    init_path_guard();
  }
});

// src/memory/primer.ts
function num2(v, dflt) {
  return typeof v === "number" && isFinite(v) ? v : dflt;
}
function eligible(entries, type, project, now) {
  return entries.filter((e) => e.status !== "superseded" && e.type === type).filter((e) => e.validTo === null || e.validTo > now).filter((e) => e.scope === "global" || e.scope === "user" || e.project === project).filter((e) => type !== "semantic" || (e.trust ?? "unknown") === "trusted").sort((a, b2) => num2(b2.importance, 0) - num2(a.importance, 0) || num2(b2.confidence, 0.5) - num2(a.confidence, 0.5) || (b2.updatedAt > a.updatedAt ? 1 : b2.updatedAt < a.updatedAt ? -1 : 0) || a.title.localeCompare(b2.title));
}
function section(title, all, max) {
  if (all.length === 0) return "";
  const shown = all.slice(0, max);
  const lines = shown.map((e) => {
    const tentative = typeof e.confidence === "number" && e.confidence < TENTATIVE_BELOW ? " _(tentative)_" : "";
    return `- **${e.title}**${tentative} \u2014 ${e.summary}`;
  });
  const hidden = all.length - shown.length;
  const footer = hidden > 0 ? `
- _\u2026and ${hidden} more (run \`/memarium-context\`)_` : "";
  return `## ${title}

${lines.join("\n")}${footer}
`;
}
function renderPrimer(project, entries, opts = {}) {
  const raw = opts.maxPerSection ?? MAX_PER_SECTION;
  const max = Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : MAX_PER_SECTION;
  const now = opts.now ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const head = `# Project memory: ${project}

> Auto-generated primer. The agent should treat this as already-known project context.
`;
  const sections = [
    section("Core rules", eligible(entries, "core", project, now), max),
    section("Project facts", eligible(entries, "semantic", project, now), max),
    section("Procedures & gotchas", eligible(entries, "procedural", project, now), max)
  ].filter(Boolean);
  if (sections.length === 0) return "";
  return [head, ...sections].join("\n");
}
var MAX_PER_SECTION, TENTATIVE_BELOW;
var init_primer = __esm({
  "src/memory/primer.ts"() {
    "use strict";
    MAX_PER_SECTION = 12;
    TENTATIVE_BELOW = 0.5;
  }
});

// src/commands/memory-query.ts
var memory_query_exports = {};
__export(memory_query_exports, {
  memoryQueryCmd: () => memoryQueryCmd
});
function isType(s) {
  const ok = ["core", "semantic", "episodic", "procedural"];
  return s && ok.includes(s) ? s : null;
}
async function memoryQueryCmd(opts) {
  const cfg = readPluginConfig();
  const cwd = opts.cwd ?? process.cwd();
  const project = resolveProjectFromCwd(cwd, cfg.repoPath);
  const view = resolveMemoryView(cfg.repoPath);
  const entries = Object.values(view.entries);
  const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const usage = loadUsage(cfg.repoPath);
  overlayUsage(entries, usage);
  const scored = scoreMemories(entries, {
    project,
    text: opts.q ?? "",
    type: isType(opts.type),
    now
  });
  const byType = (t2) => scored.filter((s) => s.entry.type === t2);
  let primer = "";
  if (project) {
    primer = renderPrimer(project, entries);
  }
  const conflicts2 = entries.filter((e) => e.status === "superseded" || e.supersedes !== null || e.validTo !== null).map((e) => ({
    entry: e,
    score: 0,
    whyRecalled: e.status === "superseded" ? "superseded" : e.supersedes !== null ? "supersedes-other" : "time-bounded"
  }));
  const semanticAll = byType("semantic");
  const isTrusted = (s) => (s.entry.trust ?? "unknown") === "trusted";
  const payload = {
    project,
    primer,
    core: byType("core"),
    procedures: byType("procedural"),
    semantic: semanticAll.filter(isTrusted),
    untrustedSemantic: semanticAll.filter((s) => !isTrusted(s)),
    episodes: byType("episodic"),
    conflicts: conflicts2,
    meta: { total: scored.length, project }
  };
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  if ((opts.q ?? "").trim() !== "") {
    try {
      const bumpIds = scored.filter((s) => Number.isFinite(s.score) && CONTENT_HIT_MARKERS.some((m) => s.whyRecalled.includes(m))).slice(0, BUMP_TOP_N).map((s) => s.entry.id);
      bumpUsage(cfg.repoPath, bumpIds, now);
    } catch {
    }
  }
}
var CONTENT_HIT_MARKERS, BUMP_TOP_N;
var init_memory_query = __esm({
  "src/commands/memory-query.ts"() {
    "use strict";
    init_plugin_config();
    init_project_resolve();
    init_source_resolver();
    init_score();
    init_usage_store();
    init_primer();
    CONTENT_HIT_MARKERS = ["keyword", "file", "commit"];
    BUMP_TOP_N = 5;
  }
});

// src/commands/memory-primer.ts
var memory_primer_exports = {};
__export(memory_primer_exports, {
  memoryPrimerCmd: () => memoryPrimerCmd
});
async function memoryPrimerCmd(opts) {
  try {
    const cfg = readPluginConfig();
    const cwd = opts.cwd ?? process.cwd();
    const project = resolveProjectFromCwd(cwd, cfg.repoPath);
    if (!project) return;
    const view = resolveMemoryView(cfg.repoPath);
    const primer = renderPrimer(project, Object.values(view.entries));
    if (primer.trim()) process.stdout.write(primer);
  } catch {
  }
}
var init_memory_primer = __esm({
  "src/commands/memory-primer.ts"() {
    "use strict";
    init_plugin_config();
    init_project_resolve();
    init_source_resolver();
    init_primer();
  }
});

// src/commands/retro-gate.ts
var retro_gate_exports = {};
__export(retro_gate_exports, {
  RETRO_REASON: () => RETRO_REASON,
  decideRetroGate: () => decideRetroGate,
  retroGateCmd: () => retroGateCmd
});
import { readFileSync as readFileSync14, existsSync as existsSync15, openSync, fstatSync, readSync, closeSync } from "node:fs";
function isRetroSignal(tu) {
  if (tu.name === "Skill" && String(tu.input?.skill ?? "").includes("memarium-retro")) return true;
  if (tu.name === "Bash") {
    const c3 = String(tu.input?.command ?? "");
    if (c3.includes("memory-write") || c3.includes("memory-propose")) return true;
  }
  return false;
}
function decideRetroGate(evt, rows) {
  if (evt.stop_hook_active) return { block: false };
  let lastUser = -1;
  rows.forEach((m, i2) => {
    if (m.isMeta === true) return;
    const msg = m.message ?? m;
    if (msg.role !== "user") return;
    const c3 = msg.content;
    const toolResultOnly = Array.isArray(c3) && c3.length > 0 && c3.every((b2) => b2?.type === "tool_result");
    if (!toolResultOnly) lastUser = i2;
  });
  let mutated = false;
  let didRetro = false;
  for (const m of rows.slice(lastUser + 1)) {
    if (m.isMeta === true) continue;
    const msg = m.message ?? m;
    if (msg.role !== "assistant") continue;
    const c3 = msg.content;
    if (!Array.isArray(c3)) continue;
    for (const b2 of c3) {
      const blk = b2;
      if (blk.type !== "tool_use") continue;
      if (blk.name && MUTATION_TOOLS.has(blk.name)) mutated = true;
      if (isRetroSignal(blk)) didRetro = true;
    }
  }
  return mutated && !didRetro ? { block: true, reason: RETRO_REASON } : { block: false };
}
function readTailLines(path, cap) {
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size;
    const start = size > cap ? size - cap : 0;
    const len = size - start;
    if (len <= 0) return [];
    const buf = Buffer.allocUnsafe(len);
    readSync(fd, buf, 0, len, start);
    const lines = buf.toString("utf8").split("\n");
    if (start > 0) lines.shift();
    return lines.filter(Boolean);
  } finally {
    closeSync(fd);
  }
}
async function retroGateCmd() {
  try {
    if (process.stdin.isTTY) return;
    let raw = "";
    try {
      raw = readFileSync14(0, "utf8");
    } catch {
      return;
    }
    const evt = raw.trim() ? JSON.parse(raw) : {};
    if (evt.stop_hook_active) return;
    const tp = evt.transcript_path;
    if (!tp || !existsSync15(tp)) return;
    const rows = readTailLines(tp, 1024 * 1024).map((l) => {
      try {
        return JSON.parse(l);
      } catch {
        return null;
      }
    }).filter((x2) => x2 !== null);
    const decision = decideRetroGate(evt, rows);
    if (decision.block) {
      process.stdout.write(JSON.stringify({ decision: "block", reason: decision.reason }) + "\n");
    }
  } catch {
  }
}
var RETRO_REASON, MUTATION_TOOLS;
var init_retro_gate = __esm({
  "src/commands/retro-gate.ts"() {
    "use strict";
    RETRO_REASON = "This turn changed files. Before you stop, capture the ONE reusable insight from it into memarium typed memory: invoke the /memarium-retro skill now \u2014 distill the insight, run the fact-hygiene + memory-query dedup, and write it (memory-write for semantic/episodic, memory-propose for gated). If, on reflection, nothing here is durably reusable \u2014 or you already captured it \u2014 say so in one line and stop; do not force a low-value memory.";
    MUTATION_TOOLS = /* @__PURE__ */ new Set(["Edit", "Write", "NotebookEdit", "MultiEdit"]);
  }
});

// src/entity/render.ts
function arr2(xs) {
  return JSON.stringify(xs ?? []);
}
function nullable2(v) {
  return v == null ? "null" : v;
}
function req2(v, fallback) {
  return v == null || v === "" ? fallback : String(v);
}
function renderEntityMarkdown(entry, body) {
  const fm = [
    "---",
    `id: ${entry.id}`,
    `kind: ${entry.kind}`,
    `scope: ${entry.scope}`,
    `project: ${nullable2(entry.project)}`,
    `title: ${entry.title}`,
    `aliases: ${arr2(entry.aliases)}`,
    `sourceMemoryIds: ${arr2(entry.sourceMemoryIds)}`,
    `sourceSessions: ${arr2(entry.sourceSessions)}`,
    `sourceFiles: ${arr2(entry.sourceFiles)}`,
    `relatedEntities: ${arr2(entry.relatedEntities)}`,
    `createdAt: ${req2(entry.createdAt, "")}`,
    `updatedAt: ${req2(entry.updatedAt, "")}`,
    "---"
  ].join("\n");
  const trimmedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  return `${fm}

# ${entry.title}

${trimmedBody}
`;
}
var init_render2 = __esm({
  "src/entity/render.ts"() {
    "use strict";
  }
});

// src/commands/entity-write.ts
var entity_write_exports = {};
__export(entity_write_exports, {
  entityWriteCmd: () => entityWriteCmd
});
import { existsSync as existsSync16, mkdirSync as mkdirSync10, readFileSync as readFileSync15, realpathSync, writeFileSync as writeFileSync10 } from "node:fs";
import { dirname as dirname5, join as join16, resolve as resolve4, sep as sep3 } from "node:path";
function entityPath(e) {
  const scopeDir = e.project ?? "_global";
  const slug = e.id.split("/").pop() ?? e.id;
  return `memory/entities/${scopeDir}/${slug}.md`;
}
async function entityWriteCmd(opts) {
  if (!opts.inputPath || !existsSync16(opts.inputPath)) {
    throw new Error(`entity-write: --input JSON not found: ${opts.inputPath}`);
  }
  const items = JSON.parse(readFileSync15(opts.inputPath, "utf8"));
  const cfg = readPluginConfig();
  const idx = loadEntityIndex(cfg.repoPath);
  let written = 0;
  const paths = [];
  for (const { entry, body } of items) {
    if (entry.project === void 0) entry.project = null;
    const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (!isDate(entry.createdAt)) entry.createdAt = today;
    if (!isDate(entry.updatedAt)) entry.updatedAt = today;
    for (const k2 of ["aliases", "sourceMemoryIds", "sourceSessions", "sourceFiles", "relatedEntities"]) {
      if (!Array.isArray(entry[k2])) entry[k2] = [];
    }
    if (!entry.path) entry.path = entityPath(entry);
    const entRoot = resolve4(join16(cfg.repoPath, "memory", "entities"));
    mkdirSync10(entRoot, { recursive: true });
    const memRoot = entRoot;
    const abs = resolve4(join16(cfg.repoPath, entry.path));
    if (abs !== memRoot && !abs.startsWith(memRoot + sep3)) {
      throw new Error(`entity-write: refusing to write outside memory/entities/: ${entry.path}`);
    }
    mkdirSync10(dirname5(abs), { recursive: true });
    const realParent = realpathSync(dirname5(abs));
    const realRoot = realpathSync(entRoot);
    if (realParent !== realRoot && !realParent.startsWith(realRoot + sep3)) {
      throw new Error(`entity-write: refusing to write outside memory/entities/ (symlink guard): ${entry.path}`);
    }
    const resolvedBody = body;
    writeFileSync10(abs, renderEntityMarkdown(entry, resolvedBody));
    upsertEntity(idx, entry);
    written++;
    paths.push(entry.path);
  }
  saveEntityIndex(cfg.repoPath, idx);
  return { written, paths };
}
var init_entity_write = __esm({
  "src/commands/entity-write.ts"() {
    "use strict";
    init_plugin_config();
    init_index_store4();
    init_render2();
  }
});

// src/entity/parse.ts
function parseArr2(v) {
  const t2 = (v ?? "").trim();
  if (t2 === "" || t2 === "[]" || t2 === "undefined" || t2 === "null") return [];
  if (t2.startsWith("[")) {
    try {
      const parsed = JSON.parse(t2);
      if (Array.isArray(parsed)) return parsed;
    } catch {
    }
  }
  return t2.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
}
function parseScalar2(v) {
  const t2 = v.trim();
  return t2 === "null" || t2 === "undefined" || t2 === "" ? null : t2;
}
function parseDate2(v) {
  const t2 = (v ?? "").trim();
  return t2 === "undefined" || t2 === "null" ? "" : t2;
}
function parseEntityMarkdown(md) {
  md = md.replace(/\r\n/g, "\n");
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const i2 = line.indexOf(":");
    if (i2 === -1) continue;
    fm[line.slice(0, i2).trim()] = line.slice(i2 + 1).trim();
  }
  if (!fm.id || !fm.kind) return null;
  return {
    id: fm.id,
    kind: fm.kind,
    scope: fm.scope ?? "",
    project: parseScalar2(fm.project ?? "null"),
    title: fm.title ?? "",
    aliases: parseArr2(fm.aliases ?? "[]"),
    sourceMemoryIds: parseArr2(fm.sourceMemoryIds ?? "[]"),
    sourceSessions: parseArr2(fm.sourceSessions ?? "[]"),
    sourceFiles: parseArr2(fm.sourceFiles ?? "[]"),
    relatedEntities: parseArr2(fm.relatedEntities ?? "[]"),
    path: "",
    // filled by caller from the file path
    createdAt: parseDate2(fm.createdAt),
    updatedAt: parseDate2(fm.updatedAt)
  };
}
var init_parse2 = __esm({
  "src/entity/parse.ts"() {
    "use strict";
  }
});

// src/commands/entity-index.ts
var entity_index_exports = {};
__export(entity_index_exports, {
  entityIndexCmd: () => entityIndexCmd
});
import { existsSync as existsSync17, readFileSync as readFileSync16, readdirSync as readdirSync3, writeFileSync as writeFileSync11, statSync as statSync2 } from "node:fs";
import { join as join17, relative as relative3 } from "node:path";
function walkMd2(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = readdirSync3(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p2 = join17(cur, e.name);
      if (e.isDirectory()) stack.push(p2);
      else if (e.isFile() && e.name.endsWith(".md")) out.push(p2);
    }
  }
  return out;
}
async function entityIndexCmd() {
  const cfg = readPluginConfig();
  const entitiesRoot = join17(cfg.repoPath, "memory", "entities");
  const idx = emptyEntityIndex();
  let indexed = 0;
  let healed = 0;
  assertNoSymlinkedComponent(cfg.repoPath, entitiesRoot, "entity-index");
  if (existsSync17(entitiesRoot)) {
    for (const abs of walkMd2(entitiesRoot)) {
      let md = readFileSync16(abs, "utf8");
      const mtimeDate = new Date(statSync2(abs).mtimeMs).toISOString().slice(0, 10);
      const fixed = healUndefinedFrontmatter(md, mtimeDate);
      if (fixed !== null) {
        writeFileSync11(abs, fixed);
        md = fixed;
        healed++;
      }
      const entry = parseEntityMarkdown(md);
      if (!entry) continue;
      entry.path = relative3(cfg.repoPath, abs);
      upsertEntity(idx, entry);
      indexed++;
    }
  }
  saveEntityIndex(cfg.repoPath, idx);
  return { indexed, healed };
}
var init_entity_index = __esm({
  "src/commands/entity-index.ts"() {
    "use strict";
    init_plugin_config();
    init_types4();
    init_index_store4();
    init_parse2();
    init_heal_frontmatter();
    init_path_guard();
  }
});

// src/entity/score.ts
function tokenize2(s) {
  return s.toLowerCase().split(/[^a-z0-9_]+/).filter((t2) => t2.length > 1);
}
function isEligible2(e, q2) {
  if (q2.kind && e.kind !== q2.kind) return false;
  if (e.scope === "global" || e.scope === "user") return true;
  if (q2.project && e.scope === `project:${q2.project}`) return true;
  return q2.project === null;
}
function scoreEntities(entries, q2) {
  const qTokens = new Set(tokenize2(q2.text));
  const out = [];
  for (const e of entries) {
    if (!isEligible2(e, q2)) continue;
    let score = 0;
    const why = [];
    if (qTokens.size > 0) {
      const haystack = new Set(tokenize2(`${e.title} ${e.aliases.join(" ")} ${e.relatedEntities.join(" ")}`));
      let hits = 0;
      for (const t2 of qTokens) if (haystack.has(t2)) hits++;
      if (hits > 0) {
        score += hits * 5;
        why.push(`name\xD7${hits}`);
      }
    }
    if (q2.project && e.scope === `project:${q2.project}`) {
      score += 4;
      why.push("scope:project");
    }
    if (e.scope === "global" || e.scope === "user") {
      score += 2;
      why.push(`scope:${e.scope}`);
    }
    score += recencyBoost2(e.updatedAt, q2.now);
    out.push({ entry: e, score, whyMatched: why.join(" ") || "scope-eligible" });
  }
  out.sort((a, b2) => b2.score - a.score || a.entry.id.localeCompare(b2.entry.id));
  return out;
}
function recencyBoost2(updatedAt, now) {
  const days = (Date.parse(now) - Date.parse(updatedAt)) / 864e5;
  if (!isFinite(days)) return 0;
  if (days < 0) return 0;
  if (days <= 7) return 2;
  if (days <= 30) return 1;
  return 0;
}
var init_score2 = __esm({
  "src/entity/score.ts"() {
    "use strict";
  }
});

// src/commands/entity-query.ts
var entity_query_exports = {};
__export(entity_query_exports, {
  entityQueryCmd: () => entityQueryCmd
});
import { existsSync as existsSync18, readFileSync as readFileSync17, realpathSync as realpathSync2 } from "node:fs";
import { join as join18, resolve as resolve5, sep as sep4 } from "node:path";
function isKind(s) {
  const ok = ["file", "symbol", "api", "concept", "person"];
  return s && ok.includes(s) ? s : null;
}
function isEligibleMemory(m, now, project) {
  if (m.status === "superseded") return false;
  if (m.validTo !== null && m.validTo <= now) return false;
  if (m.scope === "global" || m.scope === "user") return true;
  if (project && m.scope === `project:${project}`) return true;
  return project === null;
}
function isEligibleEntity(e, project) {
  if (e.scope === "global" || e.scope === "user") return true;
  if (project && e.scope === `project:${project}`) return true;
  return project === null;
}
async function entityQueryCmd(opts) {
  const cfg = readPluginConfig();
  const cwd = opts.cwd ?? process.cwd();
  const project = resolveProjectFromCwd(cwd, cfg.repoPath);
  const idx = loadEntityIndex(cfg.repoPath);
  const entries = Object.values(idx.entries);
  const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const scored = scoreEntities(entries, {
    project,
    text: opts.q ?? "",
    kind: isKind(opts.kind),
    now
  });
  const payload = {
    project,
    entities: scored
  };
  if (opts.entity) {
    const entityName = opts.entity.toLowerCase();
    const memIdx = loadMemoryIndex(cfg.repoPath);
    const referencingMemories = Object.values(memIdx.entries).filter((m) => {
      if (!isEligibleMemory(m, now, project)) return false;
      const inEntities = (Array.isArray(m.entities) ? m.entities : []).some((e) => e.toLowerCase() === entityName);
      const inTitle = m.title.toLowerCase().includes(entityName);
      return inEntities || inTitle;
    }).map((m) => ({
      id: m.id,
      title: m.title,
      type: m.type,
      sourceSessions: m.sourceSessions
    }));
    payload.referencingMemories = referencingMemories;
    const nameSlug = entityName.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const entRoot = resolve5(join18(cfg.repoPath, "memory", "entities"));
    const matchedEntities = entries.filter((e) => isEligibleEntity(e, project)).filter((e) => {
      const titleMatch = e.title.toLowerCase() === entityName;
      const aliasMatch = (Array.isArray(e.aliases) ? e.aliases : []).some((a) => typeof a === "string" && a.toLowerCase() === entityName);
      const slugMatch = nameSlug.length > 0 && e.id.toLowerCase().endsWith("/" + nameSlug);
      return titleMatch || aliasMatch || slugMatch;
    }).map((e) => {
      const abs = resolve5(join18(cfg.repoPath, e.path));
      const inRoot = abs === entRoot || abs.startsWith(entRoot + sep4);
      let body = "";
      if (inRoot && existsSync18(abs)) {
        const realRoot = existsSync18(entRoot) ? realpathSync2(entRoot) : entRoot;
        const real = realpathSync2(abs);
        if (real === realRoot || real.startsWith(realRoot + sep4)) {
          body = readFileSync17(abs, "utf8");
        }
      }
      return { entry: e, body };
    });
    payload.matchedEntities = matchedEntities;
  }
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
}
var init_entity_query = __esm({
  "src/commands/entity-query.ts"() {
    "use strict";
    init_plugin_config();
    init_project_resolve();
    init_index_store4();
    init_score2();
    init_index_store2();
  }
});

// src/qa/render.ts
function arr3(xs) {
  return JSON.stringify(xs ?? []);
}
function req3(v, fallback) {
  return v == null || v === "" ? fallback : String(v);
}
function renderQaMarkdown(entry, body) {
  const fm = [
    "---",
    `id: ${entry.id}`,
    `scope: ${entry.scope}`,
    `project: ${entry.project == null ? "null" : JSON.stringify(entry.project)}`,
    `question: ${JSON.stringify(entry.question)}`,
    `answerSummary: ${JSON.stringify(entry.answerSummary)}`,
    `kind: ${entry.kind}`,
    `tags: ${arr3(entry.tags)}`,
    `sources: ${arr3(entry.sources)}`,
    `sourceMemoryIds: ${arr3(entry.sourceMemoryIds)}`,
    `sourceSessions: ${arr3(entry.sourceSessions)}`,
    `relatedEntities: ${arr3(entry.relatedEntities)}`,
    `createdAt: ${req3(entry.createdAt, "")}`,
    `updatedAt: ${req3(entry.updatedAt, "")}`,
    "---"
  ].join("\n");
  const trimmedBody = body.replace(/^\n+/, "").replace(/\n+$/, "");
  return `${fm}

# ${entry.question}

${trimmedBody}
`;
}
var init_render3 = __esm({
  "src/qa/render.ts"() {
    "use strict";
  }
});

// src/qa/id.ts
import { createHash as createHash2 } from "node:crypto";
function normalizeSingleLine(s) {
  return s.replace(/\s+/g, " ").trim();
}
function shortHash(canonical) {
  return createHash2("sha256").update(canonical).digest("hex").slice(0, 8);
}
function qaSlug(question) {
  const canonical = normalizeSingleLine(question).toLowerCase();
  const hash = shortHash(canonical);
  let kebab = canonical.replace(UNSAFE2, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  kebab = kebab.slice(0, 48).replace(/-$/, "");
  return kebab ? `${kebab}-${hash}` : `q-${hash}`;
}
function qaId(_scope, project, question) {
  const scopeDir = project ?? "_global";
  return `qa/${scopeDir}/${qaSlug(question)}`;
}
var UNSAFE2;
var init_id = __esm({
  "src/qa/id.ts"() {
    "use strict";
    UNSAFE2 = /[\\/:*?"'<>|\s.,;!()[\]{}@#$%^&+=`~]+/g;
  }
});

// src/commands/qa-write.ts
var qa_write_exports = {};
__export(qa_write_exports, {
  qaWriteCmd: () => qaWriteCmd
});
import { existsSync as existsSync19, lstatSync as lstatSync2, mkdirSync as mkdirSync11, readFileSync as readFileSync18, realpathSync as realpathSync3, writeFileSync as writeFileSync12 } from "node:fs";
import { dirname as dirname6, join as join19, resolve as resolve6, sep as sep5 } from "node:path";
function isUnder(child, parent) {
  return child === parent || child.startsWith(parent + sep5);
}
function isSafeProjectSlug(p2) {
  if (!/^[A-Za-z0-9._-]+$/.test(p2)) return false;
  if (p2 === "." || p2 === "..") return false;
  if (p2.endsWith(".")) return false;
  if (WIN_RESERVED.test(p2.split(".")[0])) return false;
  return true;
}
function qaPath(e) {
  const scopeDir = e.project ?? "_global";
  const slug = e.id.split("/").pop() ?? e.id;
  return `memory/qa/${scopeDir}/${slug}.md`;
}
async function qaWriteCmd(opts) {
  if (!opts.inputPath || !existsSync19(opts.inputPath)) {
    throw new Error(`qa-write: --input JSON not found: ${opts.inputPath}`);
  }
  const items = JSON.parse(readFileSync18(opts.inputPath, "utf8"));
  const cfg = readPluginConfig();
  const idx = loadQaIndex(cfg.repoPath);
  let written = 0;
  const paths = [];
  for (const { entry, body } of items) {
    entry.question = normalizeSingleLine(entry.question);
    entry.answerSummary = normalizeSingleLine(entry.answerSummary);
    {
      const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v);
      const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      if (!isDate(entry.createdAt)) entry.createdAt = today;
      if (!isDate(entry.updatedAt)) entry.updatedAt = today;
      for (const k2 of ["tags", "sources", "sourceMemoryIds", "sourceSessions", "relatedEntities"]) {
        if (!Array.isArray(entry[k2])) entry[k2] = [];
      }
    }
    if (entry.scope.startsWith("project:")) {
      const slug = entry.scope.slice("project:".length).trim();
      if (!isSafeProjectSlug(slug)) {
        throw new Error(`qa-write: invalid project slug in scope ${JSON.stringify(entry.scope)}`);
      }
      entry.project = slug;
      entry.scope = `project:${slug}`;
    } else {
      const s = entry.scope.trim();
      if (s !== "global" && s !== "user") {
        throw new Error(`qa-write: invalid scope ${JSON.stringify(entry.scope)} (expected "global", "user", or "project:<slug>")`);
      }
      entry.scope = s;
      entry.project = null;
    }
    entry.id = qaId(entry.scope, entry.project, entry.question);
    entry.path = qaPath(entry);
    const qaRoot = resolve6(join19(cfg.repoPath, "memory", "qa"));
    const abs = resolve6(join19(cfg.repoPath, entry.path));
    assertNoSymlinkedComponent(cfg.repoPath, dirname6(abs), "qa-write");
    if (abs !== qaRoot && !abs.startsWith(qaRoot + sep5)) {
      throw new Error(`qa-write: refusing to write outside memory/qa/: ${entry.path}`);
    }
    mkdirSync11(qaRoot, { recursive: true });
    const realRepo = realpathSync3(cfg.repoPath);
    const realRoot = realpathSync3(qaRoot);
    if (!isUnder(realRoot, realRepo)) {
      throw new Error(`qa-write: refusing to write outside memory/qa/ (symlink guard): ${entry.path}`);
    }
    mkdirSync11(dirname6(abs), { recursive: true });
    const realParent = realpathSync3(dirname6(abs));
    if (!isUnder(realParent, realRoot)) {
      throw new Error(`qa-write: refusing to write outside memory/qa/ (symlink guard): ${entry.path}`);
    }
    let leafStat;
    try {
      leafStat = lstatSync2(abs);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    if (leafStat?.isSymbolicLink()) {
      throw new Error(`qa-write: refusing to write through a symlinked target file (symlink guard): ${entry.path}`);
    }
    writeFileSync12(abs, renderQaMarkdown(entry, body));
    upsertQa(idx, entry);
    written++;
    paths.push(entry.path);
  }
  saveQaIndex(cfg.repoPath, idx);
  return { written, paths };
}
var WIN_RESERVED;
var init_qa_write = __esm({
  "src/commands/qa-write.ts"() {
    "use strict";
    init_plugin_config();
    init_index_store3();
    init_render3();
    init_id();
    init_path_guard();
    WIN_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;
  }
});

// src/qa/parse.ts
function parseArr3(v) {
  const t2 = (v ?? "").trim();
  if (t2 === "" || t2 === "[]" || t2 === "undefined" || t2 === "null") return [];
  if (t2.startsWith("[")) {
    try {
      const parsed = JSON.parse(t2);
      if (Array.isArray(parsed)) return parsed;
    } catch {
    }
  }
  return t2.replace(/^\[|\]$/g, "").split(",").map((s) => s.trim()).filter(Boolean);
}
function parseProject(v) {
  const t2 = v.trim();
  if (t2 === "null" || t2 === "undefined" || t2 === "") return null;
  if (t2.startsWith('"')) {
    try {
      const p2 = JSON.parse(t2);
      if (typeof p2 === "string") return p2;
    } catch {
    }
  }
  return t2;
}
function parseDate3(v) {
  const t2 = (v ?? "").trim();
  return t2 === "undefined" || t2 === "null" ? "" : t2;
}
function parseQuoted(v) {
  const t2 = v.trim();
  if (t2.startsWith('"')) {
    try {
      const p2 = JSON.parse(t2);
      if (typeof p2 === "string") return p2;
    } catch {
    }
  }
  return t2;
}
function parseQaMarkdown(md) {
  md = md.replace(/\r\n/g, "\n");
  const m = md.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const i2 = line.indexOf(":");
    if (i2 === -1) continue;
    fm[line.slice(0, i2).trim()] = line.slice(i2 + 1).trim();
  }
  if (!fm.id || !fm.kind) return null;
  return {
    id: fm.id,
    scope: fm.scope ?? "",
    project: parseProject(fm.project ?? "null"),
    question: parseQuoted(fm.question ?? ""),
    answerSummary: parseQuoted(fm.answerSummary ?? ""),
    kind: fm.kind,
    tags: parseArr3(fm.tags ?? "[]"),
    sources: parseArr3(fm.sources ?? "[]"),
    sourceMemoryIds: parseArr3(fm.sourceMemoryIds ?? "[]"),
    sourceSessions: parseArr3(fm.sourceSessions ?? "[]"),
    relatedEntities: parseArr3(fm.relatedEntities ?? "[]"),
    path: "",
    createdAt: parseDate3(fm.createdAt),
    updatedAt: parseDate3(fm.updatedAt)
  };
}
var init_parse3 = __esm({
  "src/qa/parse.ts"() {
    "use strict";
  }
});

// src/commands/qa-index.ts
var qa_index_exports = {};
__export(qa_index_exports, {
  qaIndexCmd: () => qaIndexCmd
});
import { existsSync as existsSync20, readFileSync as readFileSync19, readdirSync as readdirSync4, writeFileSync as writeFileSync13, statSync as statSync3 } from "node:fs";
import { join as join20, relative as relative4 } from "node:path";
function walkMd3(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = readdirSync4(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p2 = join20(cur, e.name);
      if (e.isDirectory()) stack.push(p2);
      else if (e.isFile() && e.name.endsWith(".md")) out.push(p2);
    }
  }
  return out;
}
async function qaIndexCmd() {
  const cfg = readPluginConfig();
  const qaRoot = join20(cfg.repoPath, "memory", "qa");
  const idx = emptyQaIndex();
  let indexed = 0;
  let healed = 0;
  assertNoSymlinkedComponent(cfg.repoPath, qaRoot, "qa-index");
  if (existsSync20(qaRoot)) {
    for (const abs of walkMd3(qaRoot)) {
      let md = readFileSync19(abs, "utf8");
      const mtimeDate = new Date(statSync3(abs).mtimeMs).toISOString().slice(0, 10);
      const fixed = healUndefinedFrontmatter(md, mtimeDate);
      if (fixed !== null) {
        writeFileSync13(abs, fixed);
        md = fixed;
        healed++;
      }
      const entry = parseQaMarkdown(md);
      if (!entry) continue;
      entry.path = relative4(cfg.repoPath, abs);
      upsertQa(idx, entry);
      indexed++;
    }
  }
  saveQaIndex(cfg.repoPath, idx);
  return { indexed, healed };
}
var init_qa_index = __esm({
  "src/commands/qa-index.ts"() {
    "use strict";
    init_plugin_config();
    init_types3();
    init_index_store3();
    init_parse3();
    init_path_guard();
    init_heal_frontmatter();
  }
});

// src/qa/score.ts
function tokenize3(s) {
  return s.toLowerCase().split(/[^a-z0-9_]+/).filter((t2) => t2.length > 1);
}
function isEligible3(e, q2) {
  if (q2.kind && e.kind !== q2.kind) return false;
  if (e.scope === "global" || e.scope === "user") return true;
  if (q2.project && e.scope === `project:${q2.project}`) return true;
  return q2.project === null;
}
function recencyBoost3(updatedAt, now) {
  const days = (Date.parse(now) - Date.parse(updatedAt)) / 864e5;
  if (!isFinite(days)) return 0;
  if (days < 0) return 0;
  if (days <= 7) return 2;
  if (days <= 30) return 1;
  return 0;
}
function scoreQa(entries, q2) {
  const qTokens = new Set(tokenize3(q2.text));
  const out = [];
  for (const e of entries) {
    if (!isEligible3(e, q2)) continue;
    let score = 0;
    const why = [];
    if (qTokens.size > 0) {
      const haystack = new Set(tokenize3(`${e.question} ${e.answerSummary} ${e.tags.join(" ")}`));
      let hits = 0;
      for (const t2 of qTokens) if (haystack.has(t2)) hits++;
      if (hits > 0) {
        score += hits * 5;
        why.push(`text\xD7${hits}`);
      }
    }
    if (q2.project && e.scope === `project:${q2.project}`) {
      score += 4;
      why.push("scope:project");
    }
    if (e.scope === "global" || e.scope === "user") {
      score += 2;
      why.push(`scope:${e.scope}`);
    }
    score += recencyBoost3(e.updatedAt, q2.now);
    out.push({ entry: e, score, whyMatched: why.join(" ") || "scope-eligible" });
  }
  out.sort((a, b2) => b2.score - a.score || a.entry.id.localeCompare(b2.entry.id));
  return out;
}
var init_score3 = __esm({
  "src/qa/score.ts"() {
    "use strict";
  }
});

// src/commands/qa-query.ts
var qa_query_exports = {};
__export(qa_query_exports, {
  qaQueryCmd: () => qaQueryCmd
});
function isKind2(s) {
  const ok = ["compound", "troubleshooting", "decision", "operational"];
  return s && ok.includes(s) ? s : null;
}
async function qaQueryCmd(opts) {
  const cfg = readPluginConfig();
  const cwd = opts.cwd ?? process.cwd();
  const project = resolveProjectFromCwd(cwd, cfg.repoPath);
  const idx = loadQaIndex(cfg.repoPath);
  const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const scored = scoreQa(Object.values(idx.entries), {
    project,
    text: opts.q ?? "",
    kind: isKind2(opts.kind),
    now
  });
  const compact = scored.map((s) => ({
    entry: {
      id: s.entry.id,
      scope: s.entry.scope,
      project: s.entry.project,
      question: s.entry.question,
      answerSummary: s.entry.answerSummary,
      kind: s.entry.kind,
      path: s.entry.path
    },
    score: s.score,
    whyMatched: s.whyMatched
  }));
  process.stdout.write(JSON.stringify({ project, qa: compact }, null, 2) + "\n");
}
var init_qa_query = __esm({
  "src/commands/qa-query.ts"() {
    "use strict";
    init_plugin_config();
    init_project_resolve();
    init_index_store3();
    init_score3();
  }
});

// src/memory/lint.ts
function entrySnapshot(e) {
  let s;
  try {
    s = JSON.stringify(e);
  } catch {
    s = String(e);
  }
  if (typeof s !== "string") s = String(s);
  return s.length > 120 ? s.slice(0, 120) + "\u2026" : s;
}
function safeValues(rec) {
  if (!rec || typeof rec !== "object" || Array.isArray(rec)) return [];
  return Object.values(rec).filter(
    (v) => v !== null && typeof v === "object" && !Array.isArray(v)
  );
}
function validEntryExists(rec, id) {
  if (!rec || typeof rec !== "object" || Array.isArray(rec)) return false;
  const v = rec[id];
  return v !== null && typeof v === "object" && !Array.isArray(v) && v.id === id;
}
function inScope(scope, cwdProject) {
  if (typeof scope !== "string") return cwdProject === null;
  if (cwdProject === null) return true;
  if (scope === "global" || scope === "user") return true;
  const scopeProject = scope.startsWith("project:") ? scope.slice("project:".length) : null;
  return scopeProject === cwdProject;
}
function lintMemory(memoryIdx, entityIdx, qaIdx, opts) {
  const issues = [];
  const suggestions = [];
  const memEntries = safeValues(memoryIdx.entries).filter((e) => inScope(e.scope, opts.project));
  for (const e of memEntries) {
    try {
      if (e.status === "active" && e.validTo !== null) {
        const ts = Date.parse(e.validTo);
        let vDate = null;
        if (isFinite(ts)) {
          try {
            vDate = new Date(ts).toISOString().slice(0, 10);
          } catch {
            vDate = null;
          }
        }
        if (vDate === null) {
          issues.push({
            check: "malformed-date",
            severity: "warning",
            layer: "memory",
            id: e.id,
            detail: `unparseable validTo=${JSON.stringify(e.validTo)}`
          });
        } else if (vDate <= opts.now) {
          issues.push({
            check: "expired",
            severity: "warning",
            layer: "memory",
            id: e.id,
            detail: `active memory expired at validTo=${e.validTo} (now ${opts.now})`
          });
        }
      }
      if (typeof e.supersedes === "string" && !validEntryExists(memoryIdx.entries, e.supersedes)) {
        issues.push({
          check: "dangling-supersedes",
          severity: "error",
          layer: "memory",
          id: e.id,
          detail: `supersedes a memory not in the index`,
          refs: [e.supersedes]
        });
      }
      if (typeof e.supersedes === "string" && validEntryExists(memoryIdx.entries, e.supersedes)) {
        const target = memoryIdx.entries[e.supersedes];
        if (target.status === "active") {
          issues.push({
            check: "superseded-conflict",
            severity: "error",
            layer: "memory",
            id: e.id,
            detail: `supersedes ${target.id} but that target is still status=active`,
            refs: [target.id]
          });
        }
      }
      const exemptProvenance = e.type === "core" || e.status === "pinned";
      if (!exemptProvenance && e.sourceSessions.length === 0 && e.sourceCommits.length === 0 && e.sourceFiles.length === 0) {
        issues.push({
          check: "missing-provenance",
          severity: "warning",
          layer: "memory",
          id: e.id,
          detail: `no sourceSessions/sourceCommits/sourceFiles \u2014 origin not traceable`
        });
      }
      if (opts.knownSessions && e.type !== "core" && e.status !== "pinned") {
        const ss = Array.isArray(e.sourceSessions) ? e.sourceSessions : [];
        if (ss.length > 0 && !ss.some((s) => opts.knownSessions.has(s))) {
          issues.push({
            check: "stale-provenance",
            severity: "warning",
            layer: "memory",
            id: e.id,
            detail: `all ${ss.length} sourceSessions absent from the spool index \u2014 evidence gone`,
            refs: ss
          });
        }
      }
      if (e.status === "active" && e.type === "episodic") {
        const age = daysBetween(opts.now, e.updatedAt);
        if (!isFinite(age)) {
          issues.push({
            check: "malformed-date",
            severity: "warning",
            layer: "memory",
            id: e.id,
            detail: `unparseable updatedAt=${JSON.stringify(e.updatedAt)}`
          });
        }
      }
    } catch {
      const eid = e && typeof e.id === "string" ? e.id : "<unknown>";
      issues.push({
        check: "malformed-entry",
        severity: "error",
        layer: "memory",
        id: eid,
        detail: `entry has unexpected field types and was skipped (snapshot: ${entrySnapshot(e)})`
      });
    }
  }
  const dupThreshold = opts.dupThreshold ?? 0.6;
  const active = memEntries.filter((e) => e.status === "active");
  const buckets = /* @__PURE__ */ new Map();
  for (const e of active) {
    const key = `${e.type} ${e.scope} ${e.project ?? "_global"}`;
    const arr4 = buckets.get(key) ?? [];
    arr4.push({ e, tokens: tokenize4(`${e.title} ${e.summary}`) });
    buckets.set(key, arr4);
  }
  for (const group of buckets.values()) {
    for (let i2 = 0; i2 < group.length; i2++) {
      for (let j2 = i2 + 1; j2 < group.length; j2++) {
        try {
          const sim = jaccard(group[i2].tokens, group[j2].tokens);
          if (sim >= dupThreshold) {
            const pair = [group[i2].e.id, group[j2].e.id].slice().sort();
            issues.push({
              check: "duplicate-like",
              severity: "info",
              layer: "memory",
              id: pair[0],
              detail: `near-duplicate of ${pair[1]} (overlap ${sim.toFixed(2)})`,
              refs: pair
            });
          }
        } catch {
        }
      }
    }
  }
  const entEntries = safeValues(entityIdx.entries).filter((e) => inScope(e.scope, opts.project));
  for (const e of entEntries) {
    try {
      if (Array.isArray(e.sourceMemoryIds)) {
        for (const mid of e.sourceMemoryIds) {
          if (typeof mid !== "string") continue;
          if (!validEntryExists(memoryIdx.entries, mid)) {
            issues.push({
              check: "entity-dangling-sourceMemoryId",
              severity: "warning",
              layer: "entity",
              id: e.id,
              detail: `sourceMemoryId not in memory index`,
              refs: [mid]
            });
          }
        }
      }
      if (Array.isArray(e.relatedEntities)) {
        for (const rid of e.relatedEntities) {
          if (typeof rid !== "string") continue;
          if (!validEntryExists(entityIdx.entries, rid)) {
            issues.push({
              check: "entity-unknown-relatedEntity",
              severity: "warning",
              layer: "entity",
              id: e.id,
              detail: `relatedEntity not in entity index`,
              refs: [rid]
            });
          }
        }
      }
    } catch {
      const eid = e && typeof e.id === "string" ? e.id : "<unknown>";
      issues.push({
        check: "malformed-entry",
        severity: "error",
        layer: "entity",
        id: eid,
        detail: `entry has unexpected field types and was skipped (snapshot: ${entrySnapshot(e)})`
      });
    }
  }
  const qaEntries = safeValues(qaIdx.entries).filter((e) => inScope(e.scope, opts.project));
  for (const e of qaEntries) {
    try {
      if (Array.isArray(e.sourceMemoryIds)) {
        for (const mid of e.sourceMemoryIds) {
          if (typeof mid !== "string") continue;
          if (!validEntryExists(memoryIdx.entries, mid)) {
            issues.push({
              check: "qa-dangling-sourceMemoryId",
              severity: "warning",
              layer: "qa",
              id: e.id,
              detail: `sourceMemoryId not in memory index`,
              refs: [mid]
            });
          }
        }
      }
      if (Array.isArray(e.relatedEntities)) {
        for (const rid of e.relatedEntities) {
          if (typeof rid !== "string") continue;
          if (!validEntryExists(entityIdx.entries, rid)) {
            issues.push({
              check: "qa-unknown-relatedEntity",
              severity: "warning",
              layer: "qa",
              id: e.id,
              detail: `relatedEntity not in entity index`,
              refs: [rid]
            });
          }
        }
      }
      const expectProject = e.scope.startsWith("project:") ? e.scope.slice("project:".length) : null;
      if (expectProject !== e.project) {
        issues.push({
          check: "qa-scope-leak",
          severity: "error",
          layer: "qa",
          id: e.id,
          detail: `scope=${e.scope} implies project=${JSON.stringify(expectProject)} but stored project=${JSON.stringify(e.project)}`
        });
      }
    } catch {
      const eid = e && typeof e.id === "string" ? e.id : "<unknown>";
      issues.push({
        check: "malformed-entry",
        severity: "error",
        layer: "qa",
        id: eid,
        detail: `entry has unexpected field types and was skipped (snapshot: ${entrySnapshot(e)})`
      });
    }
  }
  const clusterMin = opts.clusterMin ?? 2;
  const epis = active.filter((e) => e.type === "episodic");
  const byEntity = /* @__PURE__ */ new Map();
  for (const e of epis) {
    if (!Array.isArray(e.entities)) continue;
    for (const tok of e.entities) {
      if (typeof tok !== "string") continue;
      const key = `${e.project ?? "_global"}::${tok.toLowerCase()}`;
      const arr4 = byEntity.get(key) ?? [];
      arr4.push(e);
      byEntity.set(key, arr4);
    }
  }
  const seenClusters = /* @__PURE__ */ new Set();
  for (const group of byEntity.values()) {
    const ids = [...new Set(group.map((e) => e.id))].sort();
    if (ids.length < clusterMin) continue;
    const sig = ids.join("|");
    if (seenClusters.has(sig)) continue;
    seenClusters.add(sig);
    suggestions.push({
      check: "promotion-candidate",
      severity: "info",
      layer: "memory",
      id: ids[0],
      detail: `${ids.length} episodic entries share an entity \u2014 consider promoting a stable fact to semantic/procedural (agent decides)`,
      refs: ids
    });
  }
  return {
    generatedAt: opts.generatedAt ?? opts.now,
    counts: { issues: issues.length, suggestions: suggestions.length },
    issues,
    suggestions
  };
}
var tokenize4, jaccard, daysBetween;
var init_lint = __esm({
  "src/memory/lint.ts"() {
    "use strict";
    tokenize4 = (s) => new Set(s.toLowerCase().split(/[^a-z0-9_]+/).filter((t2) => t2.length > 1));
    jaccard = (a, b2) => {
      if (a.size === 0 && b2.size === 0) return 0;
      let inter = 0;
      for (const t2 of a) if (b2.has(t2)) inter++;
      return inter / (a.size + b2.size - inter);
    };
    daysBetween = (a, b2) => (Date.parse(a) - Date.parse(b2)) / 864e5;
  }
});

// src/memory/proposal-store.ts
import { createHash as createHash3 } from "node:crypto";
import { existsSync as existsSync21, mkdirSync as mkdirSync12, readFileSync as readFileSync20, readdirSync as readdirSync5, rmSync, writeFileSync as writeFileSync14 } from "node:fs";
import { homedir as homedir6 } from "node:os";
import { join as join21, resolve as resolve7 } from "node:path";
function memariumHome2() {
  return join21(homedir6(), ".memarium");
}
function proposalsDir(repoPath) {
  const repoHash = createHash3("sha256").update(resolve7(repoPath)).digest("hex").slice(0, 12);
  return join21(memariumHome2(), "local-proposals", repoHash);
}
function guardQueuePath(targetAbs) {
  assertNoSymlinkedComponent(memariumHome2(), targetAbs, "proposal-store");
}
function flatTargetKey(targetKey2) {
  if (targetKey2.includes("__")) {
    throw new Error(`proposal-store: target key may not contain "__": ${JSON.stringify(targetKey2)}`);
  }
  const flat = targetKey2.split("/").join("__");
  if (flat.includes("..") || flat.includes("/") || flat.includes("\\") || flat.length === 0) {
    throw new Error(`proposal-store: unsafe target key ${JSON.stringify(targetKey2)}`);
  }
  return flat;
}
function fileFor(repoPath, idOrKey) {
  const flat = idOrKey.includes("/") ? flatTargetKey(idOrKey) : flatTargetKey(idOrKey.split("__").join("/"));
  return join21(proposalsDir(repoPath), `${flat}.json`);
}
function writeProposal(repoPath, p2) {
  const dir = proposalsDir(repoPath);
  const file = join21(dir, `${flatTargetKey(p2.targetKey)}.json`);
  guardQueuePath(file);
  mkdirSync12(dir, { recursive: true });
  writeFileSync14(file, JSON.stringify(p2, null, 2) + "\n");
  return file;
}
function readProposal(repoPath, idOrKey) {
  let file;
  try {
    file = fileFor(repoPath, idOrKey);
  } catch {
    return null;
  }
  guardQueuePath(file);
  if (!existsSync21(file)) return null;
  try {
    return JSON.parse(readFileSync20(file, "utf8"));
  } catch {
    return null;
  }
}
function listProposals(repoPath) {
  const dir = proposalsDir(repoPath);
  guardQueuePath(dir);
  if (!existsSync21(dir)) return [];
  const out = [];
  for (const name of readdirSync5(dir).sort()) {
    if (!name.endsWith(".json")) continue;
    const file = join21(dir, name);
    guardQueuePath(file);
    try {
      out.push(JSON.parse(readFileSync20(file, "utf8")));
    } catch {
    }
  }
  return out;
}
function deleteProposal(repoPath, idOrKey) {
  let file;
  try {
    file = fileFor(repoPath, idOrKey);
  } catch {
    return null;
  }
  guardQueuePath(file);
  if (!existsSync21(file)) return null;
  rmSync(file);
  return file;
}
var init_proposal_store = __esm({
  "src/memory/proposal-store.ts"() {
    "use strict";
    init_path_guard();
  }
});

// src/commands/memory-lint.ts
var memory_lint_exports = {};
__export(memory_lint_exports, {
  memoryLintCmd: () => memoryLintCmd
});
import { existsSync as existsSync22, readFileSync as readFileSync21 } from "node:fs";
import { join as join22 } from "node:path";
function readBody(repoPath, entry) {
  try {
    const md = readFileSync21(join22(repoPath, entry.path), "utf8");
    const afterFm = md.replace(/^---\n[\s\S]*?\n---\n?/, "");
    return afterFm.replace(/^\s*#[^\n]*\n+/, "").trim();
  } catch {
    return "";
  }
}
function proposeStalenessFixes(repoPath, idx, report, now) {
  const queued = [];
  for (const f of report.issues) {
    if (f.layer !== "memory" || f.check !== "expired") continue;
    const live = idx.entries[f.id];
    if (!live || live.status === "superseded") continue;
    const fixed = { ...live, status: "superseded", updatedAt: now };
    fixed.path = canonicalMemoryPath(fixed);
    const tKey = targetKey(fixed);
    const p2 = {
      proposalId: flatTargetKey(tKey),
      targetKey: tKey,
      proposedEntryId: fixed.id,
      action: deriveAction(fixed, idx.entries),
      rationale: `auto-staleness: ${f.detail} \u2192 mark superseded`,
      sourceSession: null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      // full ISO, matching memory-propose + the MemoryProposal.createdAt contract
      proposal: { entry: fixed, body: readBody(repoPath, live) }
    };
    writeProposal(repoPath, p2);
    queued.push(tKey);
  }
  return queued;
}
function readIndexOnce(repoPath, rel, layer, empty) {
  const p2 = join22(repoPath, rel);
  if (!existsSync22(p2)) return { index: empty, finding: null };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync21(p2, "utf8"));
  } catch {
    return { index: empty, finding: {
      check: "corrupt-index",
      severity: "error",
      layer,
      id: rel,
      detail: "index file is not valid JSON \u2014 treated as empty; findings for this layer may be incomplete"
    } };
  }
  const ok = parsed && typeof parsed === "object" && parsed.version === 1 && typeof parsed.entries === "object" && parsed.entries !== null && !Array.isArray(parsed.entries);
  if (!ok) {
    return { index: empty, finding: {
      check: "corrupt-index",
      severity: "error",
      layer,
      id: rel,
      detail: "index file is not a valid v1 index (version/entries shape) \u2014 treated as empty; findings for this layer may be incomplete"
    } };
  }
  return { index: parsed, finding: null };
}
function humanReport(r2) {
  const lines = [];
  lines.push(`# memory-lint \u2014 ${r2.counts.issues} issue(s), ${r2.counts.suggestions} suggestion(s)`);
  const group = (title, fs) => {
    if (fs.length === 0) return;
    lines.push(`
## ${title}`);
    for (const f of fs) {
      lines.push(`- [${f.severity}] ${f.layer}/${f.check} \u2014 ${f.id}: ${f.detail}` + (f.refs && f.refs.length ? ` (refs: ${f.refs.join(", ")})` : ""));
    }
  };
  group("Issues", r2.issues);
  group("Suggestions", r2.suggestions);
  if (r2.counts.issues === 0 && r2.counts.suggestions === 0) lines.push("\n\u2713 clean");
  return lines.join("\n") + "\n";
}
async function memoryLintCmd(opts) {
  const cfg = readPluginConfig();
  let project = null;
  if (opts.cwd) {
    try {
      project = resolveProjectFromCwd(opts.cwd, cfg.repoPath);
    } catch {
      project = null;
    }
  }
  const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  let knownSessions;
  try {
    const spool = loadIndex(cfg.repoPath);
    const pairs = Object.entries(spool.entries);
    const wellFormed = pairs.length > 0 && pairs.every(([key, ent]) => {
      const e2 = ent;
      return typeof e2.sessionId === "string" && e2.sessionId.length > 0 && typeof e2.tool === "string" && KNOWN_TOOLS.has(e2.tool) && key === `${e2.tool}:${e2.sessionId}`;
    });
    knownSessions = wellFormed ? new Set(pairs.map(([, ent]) => ent.sessionId)) : void 0;
  } catch {
    knownSessions = void 0;
  }
  const m = readIndexOnce(cfg.repoPath, MEMORY_INDEX_REL, "memory", emptyMemoryIndex());
  const e = readIndexOnce(cfg.repoPath, ENTITY_INDEX_REL, "entity", emptyEntityIndex());
  const q2 = readIndexOnce(cfg.repoPath, QA_INDEX_REL, "qa", emptyQaIndex());
  const report = lintMemory(m.index, e.index, q2.index, { now, project, generatedAt: now, knownSessions });
  const corrupt = [m.finding, e.finding, q2.finding].filter((f) => f !== null);
  if (corrupt.length) {
    report.issues = [...corrupt, ...report.issues];
    report.counts = { issues: report.issues.length, suggestions: report.suggestions.length };
  }
  const fixed = opts.fix ? proposeStalenessFixes(cfg.repoPath, m.index, report, now) : [];
  if (opts.json) {
    process.stdout.write(JSON.stringify(opts.fix ? { ...report, fixesProposed: fixed } : report, null, 2) + "\n");
  } else {
    let out = humanReport(report);
    if (opts.fix) {
      out += fixed.length ? `
${fixed.length} staleness fix(es) queued as proposals \u2014 review with \`memory-diff\` then \`memory-approve\`:
` + fixed.map((k2) => `  - ${k2}`).join("\n") + "\n" : "\nNo auto-fixable staleness (no expired active entries).\n";
    }
    process.stdout.write(out);
  }
}
var KNOWN_TOOLS;
var init_memory_lint = __esm({
  "src/commands/memory-lint.ts"() {
    "use strict";
    init_plugin_config();
    init_project_resolve();
    init_index_store();
    init_index_store2();
    init_index_store4();
    init_index_store3();
    init_types2();
    init_types4();
    init_types3();
    init_lint();
    init_proposal_store();
    init_gate();
    KNOWN_TOOLS = /* @__PURE__ */ new Set(["claude", "copilot"]);
  }
});

// src/commands/memory-propose.ts
var memory_propose_exports = {};
__export(memory_propose_exports, {
  memoryProposeCmd: () => memoryProposeCmd
});
import { existsSync as existsSync23, readFileSync as readFileSync22 } from "node:fs";
async function memoryProposeCmd(opts) {
  if (!opts.inputPath || !existsSync23(opts.inputPath)) {
    throw new Error(`memory-propose: --input JSON not found: ${opts.inputPath}`);
  }
  const items = JSON.parse(readFileSync22(opts.inputPath, "utf8"));
  const cfg = readPluginConfig();
  const idx = loadMemoryIndex(cfg.repoPath);
  for (const { entry } of items) {
    if (!isGatedChange(entry, idx.entries)) {
      throw new Error(
        `memory-propose: "${entry.id}" is not a gated change (not core/procedural/pinned and does not edit/supersede one) \u2014 use memory-write`
      );
    }
  }
  const paths = [];
  const targetKeys = [];
  const proposedEntryIds = [];
  for (const { entry, body, rationale, sourceSession } of items) {
    entry.path = canonicalMemoryPath(entry);
    const tKey = targetKey(entry);
    const p2 = {
      proposalId: flatTargetKey(tKey),
      targetKey: tKey,
      proposedEntryId: entry.id,
      action: deriveAction(entry, idx.entries),
      rationale: rationale ?? null,
      sourceSession: sourceSession ?? null,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      proposal: { entry, body }
    };
    paths.push(writeProposal(cfg.repoPath, p2));
    targetKeys.push(tKey);
    proposedEntryIds.push(entry.id);
  }
  return { proposed: items.length, paths, targetKeys, proposedEntryIds };
}
var init_memory_propose = __esm({
  "src/commands/memory-propose.ts"() {
    "use strict";
    init_plugin_config();
    init_index_store2();
    init_gate();
    init_proposal_store();
  }
});

// src/commands/memory-diff.ts
var memory_diff_exports = {};
__export(memory_diff_exports, {
  memoryDiffCmd: () => memoryDiffCmd
});
function str(v) {
  return v === null || v === void 0 ? null : String(v);
}
function bodyPreview(body) {
  const first3 = body.split("\n").slice(0, 3).join("\n");
  return first3.length <= 240 ? first3 : first3.slice(0, 240);
}
function buildView(p2, live) {
  const proposed = p2.proposal.entry;
  const changes = [];
  for (const f of FIELDS) {
    const oldV = live ? str(live[f]) : null;
    const newV = str(proposed[f]);
    if (oldV !== newV) changes.push({ field: String(f), old: oldV, new: newV });
  }
  const isCreate = p2.action === "create" || !live;
  const body = p2.proposal.body;
  const display = {
    targetKey: p2.targetKey,
    proposedEntryId: p2.proposedEntryId,
    action: p2.action,
    type: String(proposed.type),
    title: proposed.title,
    summary: proposed.summary,
    scope: String(proposed.scope),
    status: String(proposed.status),
    importance: proposed.importance,
    confidence: proposed.confidence,
    rationale: p2.rationale,
    sourceSession: p2.sourceSession,
    changedFields: isCreate ? [] : changes.map((c3) => c3.field),
    bodyLineCount: body.split("\n").length,
    bodyPreview: bodyPreview(body)
  };
  return {
    targetKey: p2.targetKey,
    proposedEntryId: p2.proposedEntryId,
    action: p2.action,
    rationale: p2.rationale,
    sourceSession: p2.sourceSession,
    fieldChanges: changes,
    oldBody: live ? `(current: ${live.path})` : null,
    newBody: body,
    display
  };
}
function typeLabel(d) {
  return d.status === "pinned" ? `[${d.type}] [pinned]` : `[${d.type}]`;
}
function renderList(views) {
  if (views.length === 0) return "No pending memory proposals.";
  const lines = [
    `${views.length} pending memory proposal(s) \u2014 review before approving (do NOT blind-approve)`,
    ""
  ];
  views.forEach((v, i2) => {
    const d = v.display;
    const changes = d.changedFields.length ? ` \xB7 changes: ${d.changedFields.join(", ")}` : "";
    lines.push(`[${i2 + 1}] ${typeLabel(d)} ${d.targetKey} (${d.action}${changes})`);
    lines.push(`    ${d.summary}`);
    const src = d.sourceSession ? `src ${d.sourceSession} \xB7 ` : "";
    lines.push(`    ${src}imp ${d.importance}`);
  });
  lines.push("");
  lines.push("Full body: memory-diff --id <targetKey>");
  lines.push("Apply: memory-approve --id <targetKey> (one at a time) \xB7 Discard: memory-reject --id <targetKey>");
  return lines.join("\n");
}
function renderDetail(v) {
  const d = v.display;
  const lines = [
    `${typeLabel(d)} ${d.targetKey} (${d.action})`,
    `src ${d.sourceSession ?? "\u2014"} \xB7 imp ${d.importance} \xB7 conf ${d.confidence}`
  ];
  if (d.rationale) lines.push(`rationale: ${d.rationale}`);
  if (d.action !== "create" && v.fieldChanges.length) {
    lines.push("changes:");
    for (const c3 of v.fieldChanges) lines.push(`  ${c3.field}: ${c3.old ?? "(none)"} \u2192 ${c3.new ?? "(none)"}`);
  }
  lines.push("--- proposed body ---");
  lines.push(v.newBody.split("\n").map((l) => `    ${l}`).join("\n"));
  lines.push("");
  lines.push(`Apply: memory-approve --id ${d.targetKey} \xB7 Discard: memory-reject --id ${d.targetKey}`);
  return lines.join("\n");
}
async function memoryDiffCmd(opts) {
  try {
    const cfg = readPluginConfig();
    const idx = loadMemoryIndex(cfg.repoPath);
    let proposals;
    if (opts.id) {
      const one = readProposal(cfg.repoPath, opts.id);
      proposals = one ? [one] : [];
    } else {
      proposals = listProposals(cfg.repoPath);
    }
    const views = proposals.map((p2) => buildView(p2, idx.entries[p2.targetKey]));
    if (opts.json) {
      console.log(JSON.stringify(views, null, 2));
      return;
    }
    if (opts.id) {
      console.log(views.length ? renderDetail(views[0]) : "No pending memory proposals.");
      return;
    }
    console.log(renderList(views));
  } catch (e) {
    if (opts.json) {
      console.log("[]");
      return;
    }
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`memory-diff: unable to read proposals (${msg})`);
  }
}
var FIELDS;
var init_memory_diff = __esm({
  "src/commands/memory-diff.ts"() {
    "use strict";
    init_plugin_config();
    init_index_store2();
    init_proposal_store();
    FIELDS = [
      "type",
      "scope",
      "project",
      "title",
      "summary",
      "status",
      "confidence",
      "importance",
      "supersedes",
      "validFrom",
      "validTo"
    ];
  }
});

// src/commands/memory-approve.ts
var memory_approve_exports = {};
__export(memory_approve_exports, {
  memoryApproveCmd: () => memoryApproveCmd
});
import { existsSync as existsSync24, readdirSync as readdirSync6, rmSync as rmSync2 } from "node:fs";
import { join as join23 } from "node:path";
function refreshPrimers(repoPath, entry) {
  const dir = join23(repoPath, "memory", "_primer");
  if (!existsSync24(dir)) return [];
  assertNoSymlinkedComponent(repoPath, dir, "memory-approve");
  const deleted = [];
  const del = (file) => {
    if (!existsSync24(file)) return;
    assertNoSymlinkedComponent(repoPath, file, "memory-approve");
    rmSync2(file);
    deleted.push(file);
  };
  const deleteAll = () => {
    for (const name of readdirSync6(dir)) if (name.endsWith(".md")) del(join23(dir, name));
  };
  const scope = typeof entry.scope === "string" ? entry.scope : "";
  const project = scope.startsWith("project:") ? scope.slice("project:".length) : null;
  if (project && isSafePathSegment(project)) {
    del(join23(dir, `${project}.md`));
  } else {
    deleteAll();
  }
  return deleted;
}
async function memoryApproveCmd(opts) {
  if (!opts.id) throw new Error("memory-approve: --id <targetKey> is required");
  const cfg = readPluginConfig();
  const prop = readProposal(cfg.repoPath, opts.id);
  if (!prop) throw new Error(`memory-approve: no pending proposal for "${opts.id}"`);
  const report = applyMemoryItems(cfg.repoPath, [prop.proposal]);
  const path = deleteProposal(cfg.repoPath, prop.targetKey);
  if (!path) {
    throw new Error(
      `memory-approve: applied "${prop.targetKey}" to live memory, but its proposal could not be removed from the queue \u2014 remove it manually`
    );
  }
  const primersRefreshed = refreshPrimers(cfg.repoPath, prop.proposal.entry);
  return {
    applied: 1,
    written: report.written,
    superseded: report.superseded,
    primersRefreshed,
    path
  };
}
var init_memory_approve = __esm({
  "src/commands/memory-approve.ts"() {
    "use strict";
    init_plugin_config();
    init_apply();
    init_proposal_store();
    init_path_guard();
    init_gate();
  }
});

// src/commands/memory-reject.ts
var memory_reject_exports = {};
__export(memory_reject_exports, {
  memoryRejectCmd: () => memoryRejectCmd
});
async function memoryRejectCmd(opts) {
  if (!opts.id) throw new Error("memory-reject: --id <targetKey> is required");
  const cfg = readPluginConfig();
  const prop = readProposal(cfg.repoPath, opts.id);
  if (!prop) {
    throw new Error(`memory-reject: no pending proposal for "${opts.id}"`);
  }
  const path = deleteProposal(cfg.repoPath, prop.targetKey);
  if (!path) {
    throw new Error(`memory-reject: proposal "${prop.targetKey}" could not be removed from the queue`);
  }
  return { rejected: 1, path };
}
var init_memory_reject = __esm({
  "src/commands/memory-reject.ts"() {
    "use strict";
    init_plugin_config();
    init_proposal_store();
  }
});

// src/commands/recall.ts
var recall_exports = {};
__export(recall_exports, {
  buildRecallPayload: () => buildRecallPayload,
  recallCmd: () => recallCmd
});
function buildRecallPayload(opts = {}) {
  const cfg = readPluginConfig();
  let projectFilter = opts.project?.trim() || null;
  let cwdUnresolved = false;
  if (!projectFilter && !opts.all && opts.cwd) {
    projectFilter = resolveProjectFromCwd(opts.cwd, cfg.repoPath);
    if (!projectFilter) cwdUnresolved = true;
  }
  const view = resolveMemoryView(cfg.repoPath);
  const entries = Object.values(view.entries);
  const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  overlayUsage(entries, loadUsage(cfg.repoPath));
  const query = (opts.q ?? "").trim();
  const scored = scoreMemories(entries, { project: projectFilter, text: query, type: null, now });
  const limit = opts.limit && opts.limit > 0 ? opts.limit : DEFAULT_LIMIT;
  const hits = scored.slice(0, limit).map((s) => ({
    id: s.entry.id,
    type: s.entry.type,
    title: s.entry.title,
    summary: s.entry.summary,
    score: s.score,
    whyRecalled: s.whyRecalled,
    path: resolveEntryAbsPath(view, s.entry.id),
    updatedAt: s.entry.updatedAt,
    entities: s.entry.entities,
    source: view.sources[s.entry.id] ?? "local"
  }));
  const payload = {
    stage: "stage-1-ranked",
    project: projectFilter,
    query,
    repoPath: cfg.repoPath,
    entries: hits,
    meta: {
      total: scored.length,
      returned: hits.length,
      ...cwdUnresolved ? { cwdUnresolved: true } : {},
      nextStep: hits.length > 0 ? "Read the top 1\u20135 entry.path with the Read tool for full bodies (episodes carry the arc)." : cwdUnresolved ? "cwd didn't resolve to a synced project \u2014 pass --project <slug> or --all." : "No memory yet for this project. Run /memarium to digest sessions."
    }
  };
  if (!query && projectFilter) {
    const primer = renderPrimer(projectFilter, entries);
    if (primer.trim()) payload.primer = primer;
  }
  return payload;
}
async function recallCmd(opts) {
  const payload = buildRecallPayload(opts);
  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  if (payload.query !== "") {
    try {
      const bumpIds = payload.entries.filter((h2) => Number.isFinite(h2.score) && CONTENT_HIT_MARKERS2.some((m) => h2.whyRecalled.includes(m))).slice(0, BUMP_TOP_N2).map((h2) => h2.id);
      const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      bumpUsage(payload.repoPath, bumpIds, now);
    } catch {
    }
  }
}
var DEFAULT_LIMIT, CONTENT_HIT_MARKERS2, BUMP_TOP_N2;
var init_recall = __esm({
  "src/commands/recall.ts"() {
    "use strict";
    init_plugin_config();
    init_project_resolve();
    init_source_resolver();
    init_score();
    init_usage_store();
    init_primer();
    DEFAULT_LIMIT = 25;
    CONTENT_HIT_MARKERS2 = ["keyword", "file", "commit"];
    BUMP_TOP_N2 = 5;
  }
});

// src/spool/plugin-state.ts
import { existsSync as existsSync25, mkdirSync as mkdirSync13, readFileSync as readFileSync23, writeFileSync as writeFileSync15 } from "node:fs";
import { homedir as homedir7 } from "node:os";
import { dirname as dirname7, join as join24 } from "node:path";
function statePath() {
  return join24(homedir7(), ".memarium", ".plugin-state.json");
}
function loadState() {
  const p2 = statePath();
  if (!existsSync25(p2)) return {};
  try {
    return JSON.parse(readFileSync23(p2, "utf8"));
  } catch {
    return {};
  }
}
function saveState(state) {
  const p2 = statePath();
  mkdirSync13(dirname7(p2), { recursive: true });
  writeFileSync15(p2, JSON.stringify(state, null, 2) + "\n");
}
var init_plugin_state = __esm({
  "src/spool/plugin-state.ts"() {
    "use strict";
  }
});

// src/commands/first-run.ts
var first_run_exports = {};
__export(first_run_exports, {
  firstRunCmd: () => firstRunCmd
});
import { execFileSync } from "node:child_process";
async function firstRunCmd() {
  const state = loadState();
  if (state.firstRunNudgeShown) return;
  const npmCliInstalled = isNpmMemariumOnPath();
  if (!npmCliInstalled) {
    console.log("memarium plugin: digest + recall ready.");
    console.log("For cross-device session sync, install the optional memarium npm CLI:");
    console.log("    npm i -g memarium");
    console.log("(See https://github.com/june9593/memarium for details.)");
  }
  saveState({ ...state, firstRunNudgeShown: true });
}
function isNpmMemariumOnPath() {
  try {
    execFileSync("/bin/sh", ["-c", "command -v memarium >/dev/null 2>&1"], {
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}
var init_first_run = __esm({
  "src/commands/first-run.ts"() {
    "use strict";
    init_plugin_state();
  }
});

// src/spool/ensure-dir.ts
import { mkdirSync as mkdirSync14, existsSync as existsSync26 } from "node:fs";
import { homedir as homedir8 } from "node:os";
import { join as join25 } from "node:path";
function ensureSpoolDir() {
  const spoolRoot = join25(homedir8(), SPOOL_REL_PATH);
  const created = !existsSync26(spoolRoot);
  const rawSessionsDir = join25(spoolRoot, "raw_sessions");
  mkdirSync14(rawSessionsDir, { recursive: true });
  return { spoolRoot, rawSessionsDir, created };
}
var SPOOL_REL_PATH;
var init_ensure_dir = __esm({
  "src/spool/ensure-dir.ts"() {
    "use strict";
    SPOOL_REL_PATH = ".memarium/session-repo";
  }
});

// src/_shared/content-project-inference.ts
import { readdirSync as readdirSync7 } from "node:fs";
import { homedir as homedir9 } from "node:os";
import { join as join26 } from "node:path";
function decodeProjectDirName(name) {
  if (!name.startsWith("-")) return name;
  return "/" + name.slice(1).replace(/-/g, "/");
}
function listKnownProjectRoots(projectsDir = join26(homedir9(), ".claude", "projects")) {
  let entries;
  try {
    entries = readdirSync7(projectsDir);
  } catch {
    return [];
  }
  const out = entries.map((name) => ({ path: decodeProjectDirName(name) }));
  out.sort((a, b2) => b2.path.length - a.path.length);
  return out;
}
function pathToProjectSlug(absPath, roots) {
  if (!absPath || !absPath.startsWith("/")) return null;
  for (const r2 of roots) {
    if (absPath === r2.path || absPath.startsWith(r2.path + "/")) return cachedProjectSlug(r2.path);
  }
  const lastSlash = absPath.lastIndexOf("/");
  if (lastSlash <= 0) return null;
  const dir = absPath.slice(0, lastSlash);
  if (dir.startsWith("/tmp/") || dir.startsWith("/private/tmp/") || dir.startsWith("/etc") || dir.startsWith("/usr") || dir.startsWith("/var") || dir.startsWith("/System") || dir.startsWith("/opt")) return null;
  const slug = cachedProjectSlug(dir);
  if (slug === "home" || slug === "root") return null;
  return slug;
}
function extractPathsFromMessages(messages) {
  const out = [];
  for (const m of messages) {
    const raw = m.raw;
    const content = raw?.message?.content;
    if (!Array.isArray(content)) continue;
    const seen = /* @__PURE__ */ new Set();
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const b2 = block;
      if (b2.type !== "tool_use") continue;
      const inp = b2.input ?? {};
      const name = b2.name ?? "";
      if (name === "Read" || name === "Write" || name === "Edit" || name === "NotebookEdit") {
        const fp = inp.file_path ?? inp.notebook_path;
        if (typeof fp === "string" && fp.startsWith("/")) seen.add(fp);
      } else if (name === "Bash") {
        const cmd = inp.command;
        if (typeof cmd === "string") {
          for (const m2 of cmd.matchAll(/\/[A-Za-z0-9._\-/]+(?:\.[A-Za-z0-9]+)?/g)) {
            const p2 = m2[0];
            if (p2.length < 6) continue;
            if (cmd.includes("http://" + p2) || cmd.includes("https://" + p2)) continue;
            seen.add(p2);
          }
        }
      } else if (name === "Glob" || name === "Grep") {
        const pat = inp.path ?? inp.pattern;
        if (typeof pat === "string" && pat.startsWith("/")) seen.add(pat);
      }
    }
    for (const p2 of seen) out.push(p2);
  }
  return out;
}
function inferProjectFromContent(messages, roots = listKnownProjectRoots()) {
  const paths = extractPathsFromMessages(messages);
  const counts = {};
  let totalHits = 0;
  for (const p2 of paths) {
    const slug = pathToProjectSlug(p2, roots);
    if (!slug) continue;
    counts[slug] = (counts[slug] ?? 0) + 1;
    totalHits++;
  }
  if (totalHits < MIN_PATH_HITS) {
    return { inferredProject: null, confidence: 0, totalHits, perProject: counts };
  }
  let topSlug = "";
  let topCount = 0;
  for (const [slug, c3] of Object.entries(counts)) {
    if (c3 > topCount) {
      topCount = c3;
      topSlug = slug;
    }
  }
  const confidence = topCount / totalHits;
  return {
    inferredProject: confidence >= MIN_CONFIDENCE ? topSlug : null,
    confidence,
    totalHits,
    perProject: counts
  };
}
var MIN_CONFIDENCE, MIN_PATH_HITS;
var init_content_project_inference = __esm({
  "src/_shared/content-project-inference.ts"() {
    "use strict";
    init_project_identity();
    MIN_CONFIDENCE = 0.7;
    MIN_PATH_HITS = 5;
  }
});

// src/_shared/sources/claude-code.ts
import { createHash as createHash4 } from "node:crypto";
import { readdirSync as readdirSync8, readFileSync as readFileSync24, statSync as statSync4, existsSync as existsSync27 } from "node:fs";
import { homedir as homedir10 } from "node:os";
import { join as join27, basename } from "node:path";
function getRoots() {
  if (cachedRoots === null) cachedRoots = listKnownProjectRoots();
  return cachedRoots;
}
function isMemariumOrTmpProjectDir(name) {
  return name.includes("-memarium-claude-") || name.includes("-memvc-claude-");
}
function parseClaudeJsonl(sourcePath, content) {
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const messages = [];
  let sessionId = "";
  let cwd = "";
  let startedAt = "";
  let endedAt = "";
  for (const line of lines) {
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    if (obj.sessionId && !sessionId) sessionId = obj.sessionId;
    if (obj.cwd && !cwd) cwd = obj.cwd;
    if (obj.type === "user" || obj.type === "assistant") {
      if (obj.isMeta === true) continue;
      const ts = typeof obj.timestamp === "string" ? obj.timestamp : void 0;
      if (ts) {
        if (!startedAt) startedAt = ts;
        endedAt = ts;
      }
      const { text: rawText, reasoning: rawReasoning, contentBlocks } = extractParts(obj.message);
      const text = sanitizeMessageText(rawText);
      const reasoning = sanitizeMessageText(rawReasoning);
      const hasToolBlocks = contentBlocks.some(
        (b2) => b2.type === "tool_use" || b2.type === "tool_result"
      );
      if (text || reasoning || hasToolBlocks) {
        const msg = {
          role: obj.type === "user" ? "user" : "assistant",
          text,
          timestamp: ts,
          raw: obj,
          contentBlocks
        };
        if (reasoning) msg.reasoning = reasoning;
        messages.push(msg);
      }
    }
  }
  const firstUser = messages.find((m) => m.role === "user")?.text ?? "";
  const { slug, display } = deriveSlug(firstUser);
  const fallbackId = basename(sourcePath, ".jsonl");
  const finalId = sessionId || fallbackId;
  const shortId = finalId.slice(0, 8);
  const cwdProject = cachedProjectSlug(cwd);
  const inference = inferProjectFromContent(messages, getRoots());
  const useInferred = inference.inferredProject !== null && inference.inferredProject !== cwdProject && inference.confidence >= MIN_CONFIDENCE;
  const project = useInferred ? inference.inferredProject : cwdProject;
  const out = {
    tool: "claude",
    sessionId: finalId,
    shortId,
    project,
    projectRaw: cwd,
    startedAt: startedAt || (/* @__PURE__ */ new Date(0)).toISOString(),
    endedAt: endedAt || (/* @__PURE__ */ new Date(0)).toISOString(),
    nameSlug: slug,
    displayName: display,
    messages,
    sourcePath
  };
  if (useInferred) {
    out.projectInferredFrom = "content";
    out.cwdProject = cwdProject;
  }
  return out;
}
function extractParts(message) {
  if (!message) return { text: "", reasoning: "", contentBlocks: [] };
  const c3 = message.content;
  if (typeof c3 === "string") {
    return {
      text: c3,
      reasoning: "",
      contentBlocks: [{ type: "text", text: c3 }]
    };
  }
  if (!Array.isArray(c3)) return { text: "", reasoning: "", contentBlocks: [] };
  const texts = [];
  const reasonings = [];
  const blocks = [];
  for (const p2 of c3) {
    if (!p2 || typeof p2 !== "object") continue;
    if (p2.type === "text" && typeof p2.text === "string") {
      texts.push(p2.text);
      blocks.push({ type: "text", text: p2.text });
    } else if (p2.type === "thinking" && typeof p2.thinking === "string" && p2.thinking.length > 0) {
      reasonings.push(p2.thinking);
      blocks.push({ type: "thinking", thinking: p2.thinking });
    } else if (p2.type === "tool_use" && typeof p2.name === "string") {
      const block = { type: "tool_use", name: p2.name, input: p2.input ?? {} };
      if (typeof p2.id === "string") block.id = p2.id;
      blocks.push(block);
    } else if (p2.type === "tool_result") {
      let content = "";
      if (typeof p2.content === "string") content = p2.content;
      else if (Array.isArray(p2.content)) {
        content = p2.content.map((part) => typeof part?.text === "string" ? part.text : "").join("");
      }
      const block = { type: "tool_result", content };
      if (typeof p2.tool_use_id === "string") block.toolUseId = p2.tool_use_id;
      blocks.push(block);
    }
  }
  return {
    text: texts.join("\n"),
    reasoning: reasonings.join("\n"),
    contentBlocks: blocks
  };
}
function sanitizeMessageText(text) {
  if (!text) return "";
  let s = text;
  s = s.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "");
  s = s.replace(/<local-command-caveat>[\s\S]*?<\/local-command-caveat>/g, "");
  s = s.replace(/<local-command-stdout>[\s\S]*?<\/local-command-stdout>/g, "");
  s = s.replace(/<command-message>[\s\S]*?<\/command-message>/g, "");
  s = s.replace(/<command-name>[\s\S]*?<\/command-name>/g, "");
  s = s.replace(/<command-args>[\s\S]*?<\/command-args>/g, "");
  s = s.replace(/<task-notification>[\s\S]*?<\/task-notification>/g, "");
  s = s.replace(/\[Request interrupted by user[^\]]*\]/g, "");
  s = s.replace(/(^|\n)Base directory for this skill:[\s\S]*?(?=\n---\n|$)/g, "");
  if (/^\s*API Error:\s/.test(s)) return "";
  s = s.trim();
  if (s.length < 10) return "";
  return s;
}
var cachedRoots, ClaudeCodeAdapter;
var init_claude_code = __esm({
  "src/_shared/sources/claude-code.ts"() {
    "use strict";
    init_slug();
    init_project_identity();
    init_content_project_inference();
    cachedRoots = null;
    ClaudeCodeAdapter = class {
      constructor(root = join27(homedir10(), ".claude", "projects")) {
        this.root = root;
      }
      name = "claude";
      async *discover() {
        if (!existsSync27(this.root)) return;
        const stack = [this.root];
        while (stack.length) {
          const dir = stack.pop();
          let entries;
          try {
            entries = readdirSync8(dir, { withFileTypes: true });
          } catch {
            continue;
          }
          for (const e of entries) {
            const p2 = join27(dir, e.name);
            if (e.isDirectory()) {
              if (dir === this.root && isMemariumOrTmpProjectDir(e.name)) continue;
              if (e.name === "subagents") continue;
              stack.push(p2);
            } else if (e.isFile() && e.name.endsWith(".jsonl")) {
              const st = statSync4(p2);
              const buf = readFileSync24(p2);
              const sha = createHash4("sha256").update(buf).digest("hex");
              yield {
                sourcePath: p2,
                sourceMtimeMs: st.mtimeMs,
                sourceSha256: sha,
                load: async () => parseClaudeJsonl(p2, buf.toString("utf8"))
              };
            }
          }
        }
      }
    };
  }
});

// src/_shared/sources/vscode-copilot.ts
import { createHash as createHash5 } from "node:crypto";
import { readdirSync as readdirSync9, readFileSync as readFileSync25, statSync as statSync5, existsSync as existsSync28 } from "node:fs";
import { homedir as homedir11 } from "node:os";
import { join as join28, basename as basename2 } from "node:path";
function defaultStorageRoot() {
  if (process.platform === "darwin")
    return join28(homedir11(), "Library", "Application Support", "Code", "User", "workspaceStorage");
  if (process.platform === "win32")
    return join28(homedir11(), "AppData", "Roaming", "Code", "User", "workspaceStorage");
  return join28(homedir11(), ".config", "Code", "User", "workspaceStorage");
}
function readWorkspacePath(workspaceJsonPath) {
  if (!existsSync28(workspaceJsonPath)) return "";
  try {
    const obj = JSON.parse(readFileSync25(workspaceJsonPath, "utf8"));
    const u = obj.folder ?? obj.workspace ?? "";
    if (!u) return "";
    return u.startsWith("file://") ? decodeURIComponent(u.slice("file://".length)) : u;
  } catch {
    return "";
  }
}
function parseCopilotJson(sourcePath, content, workspacePath) {
  const obj = JSON.parse(content);
  const fileBase = basename2(sourcePath, ".json");
  const sessionId = fileBase;
  const requests = Array.isArray(obj.requests) ? obj.requests : [];
  return buildSessionFromRequests(sourcePath, sessionId, requests, workspacePath);
}
function parseCopilotChatSessionsJsonl(sourcePath, content, workspacePath) {
  const fileBase = basename2(sourcePath, ".jsonl");
  let sessionId = fileBase;
  const turns = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const s = line.trim();
    if (!s) continue;
    let obj;
    try {
      obj = JSON.parse(s);
    } catch {
      continue;
    }
    if (obj?.kind === 0 && obj?.v) {
      if (typeof obj.v.sessionId === "string" && obj.v.sessionId) sessionId = obj.v.sessionId;
      if (Array.isArray(obj.v.requests)) {
        for (const r2 of obj.v.requests) turns.push(r2);
      }
      continue;
    }
    if (obj?.kind !== 2 || !Array.isArray(obj.k) || obj.k[0] !== "requests") continue;
    if (obj.k.length === 1 && Array.isArray(obj.v)) {
      for (const r2 of obj.v) turns.push(r2);
    } else if (obj.k.length >= 2 && typeof obj.k[1] === "number") {
      const idx = obj.k[1];
      while (turns.length <= idx) turns.push({});
      if (obj.k.length === 2) {
        turns[idx] = obj.v;
      } else {
        let cur = turns[idx];
        if (cur === void 0 || cur === null) {
          cur = {};
          turns[idx] = cur;
        }
        for (let i2 = 2; i2 < obj.k.length - 1; i2++) {
          const seg = obj.k[i2];
          if (cur[seg] === void 0) cur[seg] = typeof obj.k[i2 + 1] === "number" ? [] : {};
          cur = cur[seg];
        }
        cur[obj.k[obj.k.length - 1]] = obj.v;
      }
    }
  }
  return buildSessionFromRequests(sourcePath, sessionId, turns, workspacePath);
}
function buildSessionFromRequests(sourcePath, sessionId, requests, workspacePath) {
  const messages = [];
  let startedAt = "";
  let endedAt = "";
  for (const r2 of requests) {
    if (!r2) continue;
    const ts = typeof r2.timestamp === "number" ? new Date(r2.timestamp).toISOString() : void 0;
    if (ts) {
      if (!startedAt) startedAt = ts;
      endedAt = ts;
    }
    const userTextRaw = r2?.message?.text;
    if (typeof userTextRaw === "string" && userTextRaw) {
      const userText = sanitizeMessageText(userTextRaw);
      if (userText) messages.push({ role: "user", text: userText, timestamp: ts, raw: r2.message });
    }
    const respParts = Array.isArray(r2.response) ? r2.response : [];
    const { text: rawText, reasoning: rawReasoning, contentBlocks } = extractCopilotResponseParts(respParts);
    const text = sanitizeMessageText(rawText);
    const reasoning = sanitizeMessageText(rawReasoning);
    if (text || reasoning || contentBlocks.length > 0) {
      const msg = { role: "assistant", text, timestamp: ts, raw: respParts };
      if (reasoning) msg.reasoning = reasoning;
      if (contentBlocks.length > 0) msg.contentBlocks = contentBlocks;
      messages.push(msg);
    }
  }
  const firstUser = messages.find((m) => m.role === "user")?.text ?? "";
  const { slug, display } = deriveSlug(firstUser);
  const shortId = sessionId.slice(0, 8);
  return {
    tool: "copilot",
    sessionId,
    shortId,
    project: cachedProjectSlug(workspacePath),
    projectRaw: workspacePath,
    startedAt: startedAt || (/* @__PURE__ */ new Date(0)).toISOString(),
    endedAt: endedAt || (/* @__PURE__ */ new Date(0)).toISOString(),
    nameSlug: slug,
    displayName: display,
    messages,
    sourcePath
  };
}
function extractCopilotResponseParts(parts) {
  const texts = [];
  const reasonings = [];
  const blocks = [];
  for (const p2 of parts) {
    if (!p2 || typeof p2 !== "object") continue;
    const k2 = p2.kind;
    if (k2 === "markdownContent") {
      const v = typeof p2?.content?.value === "string" ? p2.content.value : "";
      if (v) {
        texts.push(v);
        blocks.push({ type: "text", text: v });
      }
    } else if (k2 === "thinking") {
      const v = typeof p2?.value === "string" ? p2.value : "";
      if (v) {
        reasonings.push(v);
        blocks.push({ type: "thinking", thinking: v });
      }
    } else if (k2 === "toolInvocationSerialized") {
      const toolId = typeof p2?.toolId === "string" ? p2.toolId : "tool";
      const past = p2?.pastTenseMessage?.value;
      const cur = p2?.invocationMessage?.value;
      const label = typeof past === "string" && past || typeof cur === "string" && cur || "";
      const input = p2?.toolSpecificData ?? {};
      const block = { type: "tool_use", name: toolId, input };
      if (typeof p2?.toolCallId === "string") block.id = p2.toolCallId;
      blocks.push(block);
      if (label) blocks.push({ type: "tool_result", content: label });
    }
  }
  return {
    text: texts.join("\n"),
    reasoning: reasonings.join("\n"),
    contentBlocks: blocks
  };
}
function parseCopilotTranscript(sourcePath, content, workspacePath) {
  const fileBase = basename2(sourcePath, ".jsonl");
  let sessionId = fileBase;
  const messages = [];
  let startedAt = "";
  let endedAt = "";
  const lines = content.split("\n");
  for (const line of lines) {
    const s = line.trim();
    if (!s) continue;
    let obj;
    try {
      obj = JSON.parse(s);
    } catch {
      continue;
    }
    const t2 = obj?.type;
    const ts = typeof obj?.timestamp === "string" ? obj.timestamp : void 0;
    if (ts) {
      if (!startedAt) startedAt = ts;
      endedAt = ts;
    }
    if (t2 === "session.start") {
      const sid = obj?.data?.sessionId;
      if (typeof sid === "string" && sid) sessionId = sid;
      continue;
    }
    if (t2 === "user.message") {
      const raw = typeof obj?.data?.content === "string" ? obj.data.content : "";
      const text = sanitizeMessageText(raw);
      if (text) messages.push({ role: "user", text, timestamp: ts, raw: obj });
      continue;
    }
    if (t2 === "assistant.message") {
      const rawText = typeof obj?.data?.content === "string" ? obj.data.content : "";
      const rawReasoning = typeof obj?.data?.reasoningText === "string" ? obj.data.reasoningText : "";
      const text = sanitizeMessageText(rawText);
      const reasoning = sanitizeMessageText(rawReasoning);
      if (text || reasoning) {
        const msg = { role: "assistant", text, timestamp: ts, raw: obj };
        if (reasoning) msg.reasoning = reasoning;
        messages.push(msg);
      }
      continue;
    }
    if (t2 === "tool.execution_start" || t2 === "tool.execution_complete") {
      continue;
    }
  }
  const firstUser = messages.find((m) => m.role === "user")?.text ?? "";
  const { slug, display } = deriveSlug(firstUser);
  const shortId = sessionId.slice(0, 8);
  return {
    tool: "copilot",
    sessionId,
    shortId,
    project: cachedProjectSlug(workspacePath),
    projectRaw: workspacePath,
    startedAt: startedAt || (/* @__PURE__ */ new Date(0)).toISOString(),
    endedAt: endedAt || (/* @__PURE__ */ new Date(0)).toISOString(),
    nameSlug: slug,
    displayName: display,
    messages,
    sourcePath
  };
}
var VSCodeCopilotAdapter;
var init_vscode_copilot = __esm({
  "src/_shared/sources/vscode-copilot.ts"() {
    "use strict";
    init_slug();
    init_project_identity();
    init_claude_code();
    VSCodeCopilotAdapter = class {
      constructor(root = defaultStorageRoot()) {
        this.root = root;
      }
      name = "copilot";
      async *discover() {
        if (!existsSync28(this.root)) return;
        let workspaces;
        try {
          workspaces = readdirSync9(this.root, { withFileTypes: true });
        } catch {
          return;
        }
        for (const w of workspaces) {
          if (!w.isDirectory()) continue;
          const wsDir = join28(this.root, w.name);
          const wsPath = readWorkspacePath(join28(wsDir, "workspace.json"));
          const chatDir = join28(wsDir, "chatSessions");
          const chatSessionIds = /* @__PURE__ */ new Set();
          if (existsSync28(chatDir)) {
            let files = [];
            try {
              files = readdirSync9(chatDir, { withFileTypes: true });
            } catch {
              files = [];
            }
            for (const f of files) {
              if (!f.isFile()) continue;
              const isJson = f.name.endsWith(".json");
              const isJsonl = f.name.endsWith(".jsonl");
              if (!isJson && !isJsonl) continue;
              const p2 = join28(chatDir, f.name);
              const st = statSync5(p2);
              if (st.size === 0) continue;
              chatSessionIds.add(basename2(f.name, isJsonl ? ".jsonl" : ".json"));
              const buf = readFileSync25(p2);
              const sha = createHash5("sha256").update(buf).digest("hex");
              yield {
                sourcePath: p2,
                sourceMtimeMs: st.mtimeMs,
                sourceSha256: sha,
                load: async () => isJsonl ? parseCopilotChatSessionsJsonl(p2, buf.toString("utf8"), wsPath) : parseCopilotJson(p2, buf.toString("utf8"), wsPath)
              };
            }
          }
          const transcriptsDir = join28(wsDir, "GitHub.copilot-chat", "transcripts");
          if (existsSync28(transcriptsDir)) {
            let tfiles = [];
            try {
              tfiles = readdirSync9(transcriptsDir, { withFileTypes: true });
            } catch {
              tfiles = [];
            }
            for (const f of tfiles) {
              if (!f.isFile() || !f.name.endsWith(".jsonl")) continue;
              const id = basename2(f.name, ".jsonl");
              if (chatSessionIds.has(id)) continue;
              const p2 = join28(transcriptsDir, f.name);
              const st = statSync5(p2);
              if (st.size === 0) continue;
              const buf = readFileSync25(p2);
              const sha = createHash5("sha256").update(buf).digest("hex");
              yield {
                sourcePath: p2,
                sourceMtimeMs: st.mtimeMs,
                sourceSha256: sha,
                load: async () => parseCopilotTranscript(p2, buf.toString("utf8"), wsPath)
              };
            }
          }
        }
      }
    };
  }
});

// src/_shared/digest/manifest.ts
function extractManifest(messages, messageLineOffsets) {
  const tools_used = {};
  const commits = [];
  const filesSeen = /* @__PURE__ */ new Set();
  const files_touched = [];
  const candidate_decisions = [];
  let user_turns = 0;
  let assistant_turns = 0;
  for (let i2 = 0; i2 < messages.length; i2++) {
    const m = messages[i2];
    const line = messageLineOffsets[i2] ?? 0;
    if (m.role === "user") user_turns++;
    else if (m.role === "assistant") assistant_turns++;
    if (m.role === "user" && m.text && DECISION_RE.test(m.text) && candidate_decisions.length < DECISIONS_CAP) {
      candidate_decisions.push({ line, preview: previewOf(m.text, 100) });
    }
    for (const b2 of m.contentBlocks ?? []) {
      if (b2.type !== "tool_use") continue;
      tools_used[b2.name] = (tools_used[b2.name] ?? 0) + 1;
      if (FILE_TOOLS.has(b2.name)) {
        const fp = readFilePath(b2);
        if (fp && !filesSeen.has(fp) && files_touched.length < FILES_CAP) {
          filesSeen.add(fp);
          files_touched.push(fp);
        }
      }
      if (b2.name === "Bash" && commits.length < COMMITS_CAP) {
        const cmd = readBashCommand(b2);
        if (cmd) {
          const c3 = parseCommit(cmd);
          if (c3) commits.push({ ...c3, line });
          else {
            const t2 = parseTag(cmd);
            if (t2) commits.push({ ...t2, line });
          }
        }
      }
    }
  }
  return {
    user_turns,
    assistant_turns,
    tools_used,
    commits,
    files_touched,
    candidate_decisions
  };
}
function readFilePath(b2) {
  const input = b2.input;
  if (!input || typeof input !== "object") return null;
  return typeof input.file_path === "string" ? input.file_path : null;
}
function readBashCommand(b2) {
  const input = b2.input;
  if (!input || typeof input !== "object") return null;
  return typeof input.command === "string" ? input.command : null;
}
function parseCommit(cmd) {
  const h2 = cmd.match(GIT_COMMIT_HEREDOC_RE);
  if (h2) {
    const body = (h2[2] ?? "").trim();
    const firstLine = body.split("\n", 1)[0].trim();
    return firstLine ? { sha: "", msg: firstLine } : null;
  }
  const m = cmd.match(GIT_COMMIT_RE);
  if (!m) return null;
  const msg = (m[1] ?? m[2] ?? m[3] ?? "").trim();
  return msg ? { sha: "", msg } : null;
}
function parseTag(cmd) {
  const m = cmd.match(GIT_TAG_RE);
  if (!m) return null;
  const tag = m[1];
  const msg = (m[2] ?? m[3] ?? "").trim();
  return { sha: tag, msg: msg || `tag ${tag}` };
}
function previewOf(text, max) {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? collapsed.slice(0, max - 1) + "\u2026" : collapsed;
}
var FILES_CAP, COMMITS_CAP, DECISIONS_CAP, DECISION_RE, GIT_COMMIT_RE, GIT_COMMIT_HEREDOC_RE, GIT_TAG_RE, FILE_TOOLS;
var init_manifest = __esm({
  "src/_shared/digest/manifest.ts"() {
    "use strict";
    FILES_CAP = 200;
    COMMITS_CAP = 100;
    DECISIONS_CAP = 20;
    DECISION_RE = /(我决定|我们决定|最后采用|最后用|let'?s go with|decided to|going with|ok merged|merged it|ship it as)/i;
    GIT_COMMIT_RE = /\bgit\s+commit\b[^\n]*?-m\s+(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\S+))/;
    GIT_COMMIT_HEREDOC_RE = /\bgit\s+commit\b[^\n]*?-m\s+"\$\(cat\s+<<\s*'?(\w+)'?[\r\n]+([\s\S]*?)[\r\n]+\1\s*\)"/;
    GIT_TAG_RE = /\bgit\s+tag\b(?:[^\n]*?-(?:a|s)\s+)?\s*(v[\w.\-+]+)(?:[^\n]*?-m\s+(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'))?/;
    FILE_TOOLS = /* @__PURE__ */ new Set(["Read", "Edit", "Write", "MultiEdit", "NotebookEdit"]);
  }
});

// src/_shared/digest/toc.ts
function buildTocEntries(messages, messageLineOffsets) {
  const out = [];
  for (let i2 = 0; i2 < messages.length; i2++) {
    const m = messages[i2];
    const markers = computeMarkers(m);
    if (!markers) continue;
    out.push({
      turn: i2 + 1,
      timestamp: m.timestamp ?? "",
      markers,
      preview: computePreview(m),
      line: messageLineOffsets[i2] ?? 0
    });
  }
  return out;
}
function computeMarkers(m) {
  const marks = [];
  if (m.role === "user" && m.text && m.text.length >= USER_TEXT_MIN) {
    marks.push("\u{1F9D1}");
  }
  if (m.role === "assistant") {
    let hasEdit = false;
    let hasCommit = false;
    for (const b2 of m.contentBlocks ?? []) {
      if (b2.type !== "tool_use") continue;
      if (EDIT_TOOLS.has(b2.name)) hasEdit = true;
      if (b2.name === "Bash") {
        const cmd = readCommand(b2);
        if (cmd && GIT_NOTEWORTHY_RE.test(cmd)) hasCommit = true;
      }
    }
    if (hasCommit) marks.push("\u{1F4BE}");
    if (hasEdit) marks.push("\u270F\uFE0F");
    if (m.text && m.text.length >= ASSISTANT_TEXT_MIN && !hasEdit && !hasCommit) {
      marks.push("\u{1F916}");
    }
  }
  return marks.join("");
}
function computePreview(m) {
  if (m.text) return previewOf2(m.text, 100);
  const actions = [];
  for (const b2 of m.contentBlocks ?? []) {
    if (b2.type !== "tool_use") continue;
    if (EDIT_TOOLS.has(b2.name)) {
      const fp = b2.input?.file_path;
      if (typeof fp === "string") actions.push(`${b2.name} ${fp}`);
      else actions.push(b2.name);
    } else if (b2.name === "Bash") {
      const cmd = readCommand(b2);
      if (cmd) {
        const firstLine = cmd.split("\n", 1)[0].trim();
        actions.push(firstLine);
      }
    }
    if (actions.length >= 2) break;
  }
  return previewOf2(actions.join(" \xB7 "), 100);
}
function readCommand(b2) {
  const input = b2.input;
  if (!input || typeof input !== "object") return null;
  return typeof input.command === "string" ? input.command : null;
}
function previewOf2(text, max) {
  const collapsed = text.replace(/\s+/g, " ").trim();
  return collapsed.length > max ? collapsed.slice(0, max - 1) + "\u2026" : collapsed;
}
function renderTocMarkdown(entries) {
  if (entries.length === 0) return "";
  const header = `# Table of Contents

Importance-based \u2014 real user turns (\u2265${USER_TEXT_MIN} chars), file edits, commits, and substantive assistant replies. Tool-result-only turns omitted.

| # | Time | Marker | Preview | Line |
|---|------|--------|---------|------|`;
  const rows = entries.map((e) => {
    const time = e.timestamp ? e.timestamp.slice(5, 16).replace("T", " ") : "\u2014";
    const preview = escapeTableCell(e.preview);
    return `| ${e.turn} | ${time} | ${e.markers} | ${preview} | \u2192L${e.line} |`;
  });
  return [header, ...rows].join("\n");
}
function escapeTableCell(s) {
  return s.replace(/\|/g, "\\|").replace(/\n/g, " ");
}
var USER_TEXT_MIN, ASSISTANT_TEXT_MIN, GIT_NOTEWORTHY_RE, EDIT_TOOLS;
var init_toc = __esm({
  "src/_shared/digest/toc.ts"() {
    "use strict";
    USER_TEXT_MIN = 50;
    ASSISTANT_TEXT_MIN = 200;
    GIT_NOTEWORTHY_RE = /\bgit\s+(commit|tag)\b/;
    EDIT_TOOLS = /* @__PURE__ */ new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);
  }
});

// src/spool/writer.ts
import { mkdirSync as mkdirSync15, writeFileSync as writeFileSync16 } from "node:fs";
import { join as join29 } from "node:path";
function writeSession(repoRoot, s, opts = {}) {
  const date = s.startedAt.slice(0, 10);
  const dirRel = join29("raw_sessions", s.tool, s.project, date);
  const absDir = join29(repoRoot, dirRel);
  mkdirSync15(absDir, { recursive: true });
  const base = `${s.nameSlug}__${s.shortId}`;
  const mdRel = join29(dirRel, `${base}.md`);
  const includeReasoning = opts.includeReasoning ?? true;
  const fullToolResults = opts.fullToolResults ?? process.env.MEMARIUM_FULL_TOOL_RESULTS === "1";
  writeFileSync16(
    join29(repoRoot, mdRel),
    renderMarkdown(s, { includeReasoning, fullToolResults })
  );
  return { md: mdRel };
}
function renderMarkdown(s, ctx) {
  const renderedPerMessage = [];
  for (const m of s.messages) {
    const md = renderMessageBlock(m, ctx);
    if (!md) continue;
    renderedPerMessage.push({ md, src: m });
  }
  const bodyParts = [];
  const messageLineOffsetsRelative = [];
  let currentLine = 1;
  for (let i2 = 0; i2 < renderedPerMessage.length; i2++) {
    messageLineOffsetsRelative.push(currentLine);
    const md = renderedPerMessage[i2].md;
    bodyParts.push(md);
    if (i2 < renderedPerMessage.length - 1) {
      currentLine += md.split("\n").length + 1;
    }
  }
  const body = bodyParts.join("\n\n");
  const renderedMessages = renderedPerMessage.map((r2) => r2.src);
  const manifestRel = extractManifest(renderedMessages, messageLineOffsetsRelative);
  const tocRel = buildTocEntries(renderedMessages, messageLineOffsetsRelative);
  const tocMdRel = renderTocMarkdown(tocRel);
  const frontmatterRel = renderFrontmatter(s, manifestRel);
  const tocSection = tocMdRel ? `

${tocMdRel}` : "";
  const prefixRel = frontmatterRel + tocSection + "\n\n";
  const prefixLineCount = prefixRel.split("\n").length - 1;
  const manifest = patchManifestLines(manifestRel, prefixLineCount);
  const toc = tocRel.map((e) => ({ ...e, line: e.line + prefixLineCount }));
  const frontmatter = renderFrontmatter(s, manifest);
  const tocMd = renderTocMarkdown(toc);
  return [frontmatter, tocMd, body].filter(Boolean).join("\n\n");
}
function patchManifestLines(m, offset) {
  return {
    ...m,
    commits: m.commits.map((c3) => ({ ...c3, line: c3.line + offset })),
    candidate_decisions: m.candidate_decisions.map((d) => ({ ...d, line: d.line + offset }))
  };
}
function renderFrontmatter(s, m) {
  const lines = [
    "---",
    `sessionId: ${s.sessionId}`,
    `tool: ${s.tool}`,
    `project: ${s.project}`,
    `projectRaw: ${s.projectRaw}`,
    `startedAt: ${s.startedAt}`,
    `endedAt: ${s.endedAt}`,
    `displayName: ${yamlSafeString(s.displayName)}`,
    `manifest_version: 1`,
    `user_turns: ${m.user_turns}`,
    `assistant_turns: ${m.assistant_turns}`,
    ...renderToolsUsed(m.tools_used),
    ...renderCommits(m.commits),
    ...renderFilesTouched(m.files_touched),
    ...renderCandidateDecisions(m.candidate_decisions),
    "---"
  ];
  return lines.join("\n");
}
function renderToolsUsed(t2) {
  const entries = Object.entries(t2).sort((a, b2) => b2[1] - a[1]);
  if (entries.length === 0) return ["tools_used: {}"];
  return ["tools_used:", ...entries.map(([k2, v]) => `  ${yamlSafeKey(k2)}: ${v}`)];
}
function renderCommits(commits) {
  if (commits.length === 0) return ["commits: []"];
  return [
    "commits:",
    ...commits.map((c3) => `  - { sha: ${yamlSafeString(c3.sha)}, msg: ${yamlSafeString(c3.msg)}, line: ${c3.line} }`)
  ];
}
function renderFilesTouched(files) {
  if (files.length === 0) return ["files_touched: []"];
  return [
    "files_touched:",
    ...files.map((f) => `  - ${yamlSafeString(f)}`)
  ];
}
function renderCandidateDecisions(decisions) {
  if (decisions.length === 0) return ["candidate_decisions: []"];
  return [
    "candidate_decisions:",
    ...decisions.map((d) => `  - { line: ${d.line}, preview: ${yamlSafeString(d.preview)} }`)
  ];
}
function yamlSafeString(s) {
  if (/^[A-Za-z0-9_一-鿿　-〿 -]+$/.test(s) && s === s.trim()) return s;
  const escaped = s.replace(/'/g, "''");
  return `'${escaped}'`;
}
function yamlSafeKey(s) {
  if (/^[A-Za-z0-9_-]+$/.test(s)) return s;
  return `'${s.replace(/'/g, "''")}'`;
}
function renderMessageBlock(m, ctx) {
  const heading = m.role === "user" ? "## User" : m.role === "assistant" ? "## Assistant" : `## ${m.role}`;
  const ts = m.timestamp ? ` _(${m.timestamp})_` : "";
  const rendered = renderMessageContent(m.contentBlocks, m.text, m.reasoning, ctx);
  if (!rendered.trim()) return "";
  return `${heading}${ts}

${rendered}`;
}
function renderMessageContent(blocks, fallbackText, fallbackReasoning, ctx) {
  if (blocks && blocks.length > 0) {
    const out2 = [];
    for (const b2 of blocks) {
      if (b2.type === "thinking") {
        if (!ctx.includeReasoning) continue;
        out2.push(renderThinking(b2.thinking));
      } else if (b2.type === "text") {
        if (b2.text.trim()) out2.push(b2.text);
      } else if (b2.type === "tool_use") {
        out2.push(renderToolUse(b2, ctx));
      } else if (b2.type === "tool_result") {
        out2.push(renderToolResult(b2, ctx));
      }
    }
    return out2.join("\n\n");
  }
  const out = [];
  if (ctx.includeReasoning && fallbackReasoning) {
    out.push(renderThinking(fallbackReasoning));
  }
  if (fallbackText) out.push(fallbackText);
  return out.join("\n\n");
}
function renderThinking(text) {
  const quoted = text.split("\n").map((l) => `> ${l}`).join("\n");
  return `> \u{1F4AD} _thinking_
${quoted}`;
}
function renderToolUse(b2, ctx) {
  const inputStr = JSON.stringify(b2.input, null, 2);
  const truncated = ctx.fullToolResults ? inputStr : maybeTruncate(inputStr, "input");
  return `### \u{1F527} tool_use: ${b2.name}

\`\`\`json
${truncated}
\`\`\``;
}
function renderToolResult(b2, ctx) {
  const truncated = ctx.fullToolResults ? b2.content : maybeTruncate(b2.content, "output");
  return `### \u2705 tool_result

\`\`\`
${truncated}
\`\`\``;
}
function maybeTruncate(s, kind) {
  if (Buffer.byteLength(s, "utf8") <= TRUNCATE_THRESHOLD_BYTES) return s;
  const lines = s.split("\n");
  if (lines.length <= 50) {
    const head2 = s.slice(0, 4e3);
    const tail2 = s.slice(-1e3);
    return `${head2}

[... truncated: ${(Buffer.byteLength(s, "utf8") / 1024).toFixed(1)} KB total, showing first 4000 + last 1000 chars ...]

${tail2}`;
  }
  const head = lines.slice(0, 30).join("\n");
  const tail = lines.slice(-10).join("\n");
  const omitted = lines.length - 40;
  const sizeKb = (Buffer.byteLength(s, "utf8") / 1024).toFixed(1);
  return `${head}

[... truncated: ${sizeKb} KB ${kind}, omitting ${omitted} middle lines ...]

${tail}`;
}
var TRUNCATE_THRESHOLD_BYTES;
var init_writer = __esm({
  "src/spool/writer.ts"() {
    "use strict";
    init_manifest();
    init_toc();
    TRUNCATE_THRESHOLD_BYTES = 20 * 1024;
  }
});

// src/spool/scan-and-import.ts
async function scanAndImport(opts) {
  const { spoolRoot } = ensureSpoolDir();
  const adapters = [
    new ClaudeCodeAdapter(),
    new VSCodeCopilotAdapter()
  ];
  const idx = loadIndex(spoolRoot);
  const result = {
    imported: 0,
    skipped: 0,
    filteredAsPseudoProject: 0,
    filteredByProject: 0
  };
  for (const adapter of adapters) {
    for await (const discovered of adapter.discover()) {
      let session;
      try {
        session = await discovered.load();
      } catch {
        continue;
      }
      if (!isRealProjectPath(session.project)) {
        result.filteredAsPseudoProject++;
        continue;
      }
      if (opts.projectFilter && session.project !== opts.projectFilter) {
        result.filteredByProject++;
        continue;
      }
      if (hasUnchanged(idx, session.tool, session.sessionId, discovered.sourceMtimeMs, discovered.sourceSha256)) {
        result.skipped++;
        continue;
      }
      if (session.messages.length === 0) {
        result.skipped++;
        continue;
      }
      const written = writeSession(spoolRoot, session, { includeReasoning: true });
      const entry = {
        sessionId: session.sessionId,
        shortId: session.shortId,
        tool: session.tool,
        project: session.project,
        projectRaw: session.projectRaw,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        nameSlug: session.nameSlug,
        displayName: session.displayName,
        relativePath: written.md,
        sourcePath: session.sourcePath,
        sourceMtimeMs: discovered.sourceMtimeMs,
        sourceSha256: discovered.sourceSha256
      };
      upsertEntry(idx, entry);
      result.imported++;
    }
  }
  saveIndex(spoolRoot, idx);
  return result;
}
var init_scan_and_import = __esm({
  "src/spool/scan-and-import.ts"() {
    "use strict";
    init_claude_code();
    init_vscode_copilot();
    init_project_filter();
    init_index_store();
    init_ensure_dir();
    init_writer();
  }
});

// src/digest/orchestrator.ts
var orchestrator_exports = {};
__export(orchestrator_exports, {
  orchestrateCmd: () => orchestrateCmd
});
async function orchestrateCmd(opts) {
  if (opts.mode !== "project" && opts.mode !== "global") {
    throw new Error(`Invalid mode '${opts.mode}'. Expected 'project' or 'global'.`);
  }
  ensureSpoolDir();
  let result;
  if (opts.mode === "project") {
    const cwd = opts.cwd ?? process.cwd();
    const project = cachedProjectSlug(cwd);
    const scan = await scanAndImport({ projectFilter: project });
    result = {
      mode: "project",
      project,
      cwd,
      scan,
      nextStep: "run-prepare-then-digest"
    };
  } else {
    const scan = await scanAndImport({ projectFilter: null });
    result = {
      mode: "global",
      project: null,
      cwd: null,
      scan,
      nextStep: "run-fanout-then-finalize"
    };
  }
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
}
var init_orchestrator = __esm({
  "src/digest/orchestrator.ts"() {
    "use strict";
    init_ensure_dir();
    init_scan_and_import();
    init_project_identity();
  }
});

// node_modules/commander/esm.mjs
var import_index = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  // deprecated old name
  Command,
  Argument,
  Option,
  Help
} = import_index.default;

// src/plugin-cli.ts
import { readFileSync as readFileSync26 } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname as dirname8, resolve as resolve8 } from "node:path";
function readPackageVersion() {
  const here = dirname8(fileURLToPath(import.meta.url));
  for (const rel of ["../package.json", "../../package.json", "../../../package.json"]) {
    try {
      return JSON.parse(readFileSync26(resolve8(here, rel), "utf8")).version;
    } catch {
    }
  }
  return "0.0.0-unknown";
}
async function run(argv) {
  const program2 = new Command();
  program2.name("memarium-plugin").description("Memarium Claude Code plugin internal CLI (invoked by skills, not by users)").version(readPackageVersion(), "-v, --version", "print the installed plugin version");
  program2.command("list-projects").description("List projects with pending sessions in the spool. Used by /memarium to detect mode.").action(async () => {
    const { listProjectsCmd: listProjectsCmd2 } = await Promise.resolve().then(() => (init_list_projects(), list_projects_exports));
    await listProjectsCmd2();
  });
  program2.command("status").description("Digest coverage: synced sessions vs digested vs pending, plus episode + memory (typed / entities / Q&A) layer counts.").action(async () => {
    const { statusCmd: statusCmd2 } = await Promise.resolve().then(() => (init_status(), status_exports));
    await statusCmd2();
  });
  program2.command("prepare").description("Emit the JSON payload of new sessions for the /memarium skill to digest.").option("--cwd <path>", "treat this dir as the user's cwd (default: process.cwd())").option("--project <slug>", "force a specific project slug").action(async (opts) => {
    const { prepareCmd: prepareCmd2 } = await Promise.resolve().then(() => (init_prepare(), prepare_exports));
    await prepareCmd2({ cwd: opts.cwd, project: opts.project });
  });
  program2.command("finalize").description("Ensure the session-repo is a git repo, commit all plugin-written paths (raw_sessions/memory/index), and push if a remote is configured. Never stages foreign files.").option("--no-push", "commit locally only; never push even if a remote is configured").action(async (o2) => {
    const { finalizeCmd: finalizeCmd2 } = await Promise.resolve().then(() => (init_finalize(), finalize_exports));
    const r2 = await finalizeCmd2({ noPush: o2.push === false });
    process.stdout.write(JSON.stringify(r2, null, 2) + "\n");
  });
  program2.command("memory-write").description("Write typed-memory .md files + update the memory index from an agent JSON payload.").option("--input <path>", "path to memory entries JSON").action(async (opts) => {
    const { memoryWriteCmd: memoryWriteCmd2 } = await Promise.resolve().then(() => (init_memory_write(), memory_write_exports));
    const report = await memoryWriteCmd2({ inputPath: opts.input });
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  });
  program2.command("memory-index").description("Rebuild .memarium/index.memory.json from the memory/ markdown files.").action(async () => {
    const { memoryIndexCmd: memoryIndexCmd2 } = await Promise.resolve().then(() => (init_memory_index(), memory_index_exports));
    const report = await memoryIndexCmd2();
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  });
  program2.command("skip-write").description("Record intentionally-not-digested sessions in the local skip ledger (.memarium/index.skips.json) so the digest doesn't re-propose them. --input JSON: [{sessionId,reason?}] or {sessions:[...]}.").requiredOption("--input <path>", "path to skip entries JSON (required)").action(async (opts) => {
    const { skipWriteCmd: skipWriteCmd2 } = await Promise.resolve().then(() => (init_skip_write(), skip_write_exports));
    const report = await skipWriteCmd2({ inputPath: opts.input });
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  });
  program2.command("memory-query").description("Load typed memory for the cwd's project and emit layered context (Core/Procedures/Semantic/Episodes/Conflicts) + primer.").option("--cwd <path>", "treat this dir as the user's cwd (default: process.cwd())").option("--type <type>", "filter by memory type").option("--q <text>", "free-text query").action(async (opts) => {
    const { memoryQueryCmd: memoryQueryCmd2 } = await Promise.resolve().then(() => (init_memory_query(), memory_query_exports));
    await memoryQueryCmd2({ cwd: opts.cwd, type: opts.type, q: opts.q });
  });
  program2.command("memory-primer").description("Read-only: print the cwd project's primer markdown (used by the SessionStart hook). Never writes, always exits 0.").option("--cwd <path>", "treat this dir as the user's cwd (default: process.cwd())").action(async (opts) => {
    const { memoryPrimerCmd: memoryPrimerCmd2 } = await Promise.resolve().then(() => (init_memory_primer(), memory_primer_exports));
    await memoryPrimerCmd2({ cwd: opts.cwd });
  });
  program2.command("retro-gate").description("Read-only: reads the Stop-hook event JSON on stdin and, only when the just-finished turn changed files (and hasn't already retro'd), prints a {decision:block} JSON that makes the agent run /memarium-retro before stopping. Backs the Stop hook. Never writes, never throws.").action(async () => {
    const { retroGateCmd: retroGateCmd2 } = await Promise.resolve().then(() => (init_retro_gate(), retro_gate_exports));
    await retroGateCmd2();
  });
  program2.command("entity-write").description("Write entity-wiki .md pages + update .memarium/index.entity.json from an agent JSON payload.").option("--input <path>", "path to entity pages JSON").action(async (o2) => {
    const { entityWriteCmd: entityWriteCmd2 } = await Promise.resolve().then(() => (init_entity_write(), entity_write_exports));
    const r2 = await entityWriteCmd2({ inputPath: o2.input });
    process.stdout.write(JSON.stringify(r2, null, 2) + "\n");
  });
  program2.command("entity-index").description("Rebuild .memarium/index.entity.json from memory/entities/ markdown.").action(async () => {
    const { entityIndexCmd: entityIndexCmd2 } = await Promise.resolve().then(() => (init_entity_index(), entity_index_exports));
    const r2 = await entityIndexCmd2();
    process.stdout.write(JSON.stringify(r2, null, 2) + "\n");
  });
  program2.command("entity-query").description("Load entity wiki for the cwd's project, score, and emit ranked entities. --entity <name> adds a reverse lookup of memories referencing it (for digest authoring).").option("--cwd <path>", "treat this dir as cwd (default process.cwd())").option("--q <text>", "free-text query").option("--kind <kind>", "filter by entity kind (file|symbol|api|concept|person)").option("--entity <name>", "reverse-lookup: entities + memories referencing this name").action(async (o2) => {
    const { entityQueryCmd: entityQueryCmd2 } = await Promise.resolve().then(() => (init_entity_query(), entity_query_exports));
    await entityQueryCmd2(o2);
  });
  program2.command("qa-write").description("Write distilled Q&A .md pages + update .memarium/index.qa.json from an agent JSON payload.").option("--input <path>", "path to qa pages JSON").action(async (o2) => {
    const { qaWriteCmd: qaWriteCmd2 } = await Promise.resolve().then(() => (init_qa_write(), qa_write_exports));
    const r2 = await qaWriteCmd2({ inputPath: o2.input });
    process.stdout.write(JSON.stringify(r2, null, 2) + "\n");
  });
  program2.command("qa-index").description("Rebuild .memarium/index.qa.json from memory/qa/ markdown.").action(async () => {
    const { qaIndexCmd: qaIndexCmd2 } = await Promise.resolve().then(() => (init_qa_index(), qa_index_exports));
    const r2 = await qaIndexCmd2();
    process.stdout.write(JSON.stringify(r2, null, 2) + "\n");
  });
  program2.command("qa-query").description("Load distilled Q&A for the cwd's project, score, and emit ranked Q&A (index-only, read-only).").option("--cwd <path>", "working directory to resolve the project from").option("--q <text>", "free-text query").option("--kind <kind>", "filter by qa kind (compound|troubleshooting|decision|operational)").action(async (o2) => {
    const { qaQueryCmd: qaQueryCmd2 } = await Promise.resolve().then(() => (init_qa_query(), qa_query_exports));
    await qaQueryCmd2(o2);
  });
  program2.command("memory-lint").description("Read-only integrity diagnostic across memory/entity/qa indexes (never writes the repo). --json for structured output; --fix queues review proposals for expired entries.").option("--cwd <path>", "scope findings to the project at this path (+ global/user); default: lint the whole store").option("--json", "emit the structured LintReport JSON instead of a human report").option("--fix", "queue a review proposal (status\u2192superseded) for each expired entry \u2014 goes through memory-diff/approve, never a direct write").action(async (o2) => {
    const { memoryLintCmd: memoryLintCmd2 } = await Promise.resolve().then(() => (init_memory_lint(), memory_lint_exports));
    await memoryLintCmd2({ cwd: o2.cwd, json: o2.json, fix: o2.fix });
  });
  program2.command("memory-propose").description("Queue a gated (core/procedural/pinned) memory change as a local proposal instead of writing it. Reads an --input JSON array of {entry, body, rationale?, sourceSession?}.").requiredOption("--input <path>", "JSON file: array of { entry, body, rationale?, sourceSession? }").action(async (o2) => {
    const { memoryProposeCmd: memoryProposeCmd2 } = await Promise.resolve().then(() => (init_memory_propose(), memory_propose_exports));
    const r2 = await memoryProposeCmd2({ inputPath: o2.input });
    console.log(JSON.stringify(r2));
  });
  program2.command("memory-diff").description("Read-only: show pending local memory proposals as a diff vs current live memory. Never writes.").option("--id <targetKey>", "show only the proposal for this target (e.g. core/yue-workflow)").option("--json", "emit a structured JSON array instead of a human report").action(async (o2) => {
    const { memoryDiffCmd: memoryDiffCmd2 } = await Promise.resolve().then(() => (init_memory_diff(), memory_diff_exports));
    await memoryDiffCmd2({ id: o2.id, json: o2.json });
  });
  program2.command("memory-approve").description("Apply a pending local memory proposal to live memory, delete the proposal, and refresh affected primers.").requiredOption("--id <targetKey>", "the proposal's target key (e.g. core/yue-workflow)").action(async (o2) => {
    const { memoryApproveCmd: memoryApproveCmd2 } = await Promise.resolve().then(() => (init_memory_approve(), memory_approve_exports));
    const r2 = await memoryApproveCmd2({ id: o2.id });
    console.log(JSON.stringify(r2));
  });
  program2.command("memory-reject").description("Discard a pending local memory proposal without applying it.").requiredOption("--id <targetKey>", "the proposal's target key (e.g. core/yue-workflow)").action(async (o2) => {
    const { memoryRejectCmd: memoryRejectCmd2 } = await Promise.resolve().then(() => (init_memory_reject(), memory_reject_exports));
    const r2 = await memoryRejectCmd2({ id: o2.id });
    console.log(JSON.stringify(r2));
  });
  program2.command("recall").description("Ranked recall over typed memory. Stage 1 = this command (scored episodes + facts + procedures for --q); stage 2 = Read the top entry paths.").option("--cwd <path>", "infer project from this cwd").option("--project <slug>", "force a specific project slug").option("--q <text>", "task keywords to score against (title/summary/entities + file/commit overlap)").option("--all", "recall across every project (no cwd/project filter)").option("--limit <n>", "max hits to return (default 25)", (v) => parseInt(v, 10)).action(async (opts) => {
    const { recallCmd: recallCmd2 } = await Promise.resolve().then(() => (init_recall(), recall_exports));
    await recallCmd2({ cwd: opts.cwd, project: opts.project, q: opts.q, all: opts.all, limit: opts.limit });
  });
  program2.command("first-run").description("Show one-time onboarding tip if not shown before. Used by skill at start.").action(async () => {
    const { firstRunCmd: firstRunCmd2 } = await Promise.resolve().then(() => (init_first_run(), first_run_exports));
    await firstRunCmd2();
  });
  program2.command("orchestrate <mode>").description("Plugin's autonomy entry: scan local jsonl into spool, then yield to caller. Modes: project | global").option("--cwd <path>", "user cwd (project mode)").action(async (mode, opts) => {
    const { orchestrateCmd: orchestrateCmd2 } = await Promise.resolve().then(() => (init_orchestrator(), orchestrator_exports));
    await orchestrateCmd2({ mode, cwd: opts.cwd });
  });
  await program2.parseAsync(argv);
}
var _thisFile = fileURLToPath(import.meta.url);
var _mainFile = process.argv[1] ? resolve8(process.argv[1]) : "";
if (_thisFile === _mainFile || _mainFile.endsWith("memarium-plugin.js")) {
  run(process.argv).catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
export {
  run
};
