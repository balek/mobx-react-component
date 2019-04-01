import { memo, ReactElement } from "react"
import { useMobxObserver } from "./useMobxObserver"

interface IObserverProps {
    children?(): ReactElement<any>
    render?(): ReactElement<any>
}

const observerWrapper = ({ children, render }: IObserverProps) => {
    const component = children || render
    if (typeof component !== "function") {
        return null
    }
    return useMobxObserver(component)
}
observerWrapper.propTypes = {
    children: ObserverPropsCheck,
    render: ObserverPropsCheck
}

const ObserverComponent = memo(observerWrapper)
ObserverComponent.displayName = "Observer"

export { ObserverComponent as Observer }

function ObserverPropsCheck(
    props: { [k: string]: any },
    key: string,
    componentName: string,
    location: any,
    propFullName: string
) {
    const extraKey = key === "children" ? "render" : "children"
    const hasProp = typeof props[key] === "function"
    const hasExtraProp = typeof props[extraKey] === "function"
    if (hasProp && hasExtraProp) {
        return new Error(
            "MobX Observer: Do not use children and render in the same time in`" + componentName
        )
    }

    if (hasProp || hasExtraProp) {
        return null
    }
    return new Error(
        "Invalid prop `" +
            propFullName +
            "` of type `" +
            typeof props[key] +
            "` supplied to" +
            " `" +
            componentName +
            "`, expected `function`."
    )
}
