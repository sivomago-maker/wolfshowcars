const express = require("express");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

const app = express();

app.use(express.json());

// =====================================================
// CONFIGURACIÓN
// =====================================================

const ROOT = process.cwd();

const PORT = process.env.PORT || 3000;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

const URL_SITIO = "https://wolfshowcars.onrender.com";

// =====================================================
// VALIDAR VARIABLES DE ENTORNO
// =====================================================

if (!SUPABASE_URL) {
console.error("ERROR: falta SUPABASE_URL");
}

if (!SUPABASE_KEY) {
console.error("ERROR: falta SUPABASE_KEY");
}

if (!MP_ACCESS_TOKEN) {
console.error("ERROR: falta MP_ACCESS_TOKEN");
}

// =====================================================
// SUPABASE
// =====================================================

const supabase = createClient(
SUPABASE_URL,
SUPABASE_KEY
);

// =====================================================
// ARCHIVOS DEL SITIO
// =====================================================

app.use(express.static(ROOT));

// =====================================================
// PÁGINA PRINCIPAL
// =====================================================

app.get("/", function (req, res) {

```
res.sendFile(
    path.join(ROOT, "index.html")
);
```

});

// =====================================================
// PÁGINA PAGO EXITOSO
// =====================================================

app.get("/pago-exitoso.html", function (req, res) {

```
res.sendFile(
    path.join(ROOT, "pago-exitoso.html")
);
```

});

// =====================================================
// API — ESTADO DEL SERVIDOR
// =====================================================

app.get("/api/estado", function (req, res) {

```
res.json({

    ok: true,

    servidor: "WOLF SHOWCARS",

    estado: "FUNCIONANDO",

    fecha: new Date().toISOString()

});
```

});

// =====================================================
// GENERAR NÚMERO DE ACREDITACIÓN
// =====================================================

function generarNumeroAcreditacion() {

```
return "WSC27-" +
    Math.floor(
        100000 +
        Math.random() * 900000
    );
```

}

// =====================================================
// GENERAR CÓDIGO DE SEGURIDAD
// =====================================================

function generarCodigoSeguridad() {

```
const caracteres =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

let codigo = "";

for (let i = 0; i < 10; i++) {

    codigo += caracteres.charAt(
        Math.floor(
            Math.random() *
            caracteres.length
        )
    );

}

return codigo;
```

}

// =====================================================
// API — CREAR ACREDITACIÓN
// =====================================================

app.post(
"/api/acreditaciones",
async function (req, res) {

```
    try {

        console.log(
            "=========================================="
        );

        console.log(
            "NUEVA SOLICITUD DE ACREDITACIÓN"
        );

        const datos = req.body;

        console.log(datos);

        // =================================================
        // CAMPOS OBLIGATORIOS
        // =================================================

        const camposObligatorios = [

            "nombre",
            "dni",
            "telefono",
            "instagram",
            "marca",
            "modelo",
            "anio",
            "patente"

        ];

        for (const campo of camposObligatorios) {

            if (
                !datos[campo] ||
                String(datos[campo]).trim() === ""
            ) {

                return res.status(400).json({

                    ok: false,

                    mensaje:
                        "Falta completar el campo: " +
                        campo

                });

            }

        }

        // =================================================
        // ACOMPAÑANTES
        // =================================================

        const acompanantes =
            Number(datos.acompanantes || 0);

        if (
            !Number.isInteger(acompanantes) ||
            acompanantes < 0
        ) {

            return res.status(400).json({

                ok: false,

                mensaje:
                    "La cantidad de acompañantes no es válida."

            });

        }

        // =================================================
        // PRECIOS
        // =================================================

        const precioAuto = 12000;

        const precioAcompanante = 3000;

        const total =
            precioAuto +
            (
                acompanantes *
                precioAcompanante
            );

        // =================================================
        // IDENTIFICADORES
        // =================================================

        const numeroAcreditacion =
            generarNumeroAcreditacion();

        const codigoSeguridad =
            generarCodigoSeguridad();

        // =================================================
        // LIMPIAR DATOS
        // =================================================

        const nombre =
            String(datos.nombre).trim();

        const dni =
            String(datos.dni).trim();

        const telefono =
            String(datos.telefono).trim();

        const instagram =
            String(datos.instagram).trim();

        const marca =
            String(datos.marca).trim();

        const modelo =
            String(datos.modelo).trim();

        const anio =
            String(datos.anio).trim();

        const patente =
            String(datos.patente)
                .trim()
                .toUpperCase();

        // =================================================
        // GUARDAR ACREDITACIÓN EN SUPABASE
        // =================================================

        const { data, error } =
            await supabase
                .from("acreditaciones")
                .insert([

                    {

                        numero_acreditacion:
                            numeroAcreditacion,

                        codigo_seguridad:
                            codigoSeguridad,

                        nombre,
                        dni,
                        telefono,
                        instagram,
                        marca,
                        modelo,
                        anio,
                        patente,

                        acompanantes,

                        precio_auto:
                            precioAuto,

                        precio_acompanante:
                            precioAcompanante,

                        total,

                        estado:
                            "PENDIENTE_PAGO"

                    }

                ])
                .select()
                .single();

        // =================================================
        // ERROR SUPABASE
        // =================================================

        if (error) {

            console.error(
                "ERROR SUPABASE:"
            );

            console.error(error);

            return res.status(500).json({

                ok: false,

                mensaje:
                    "No se pudo guardar la acreditación en la base de datos.",

                error:
                    error.message

            });

        }

        // =================================================
        // CREAR PREFERENCIA DE MERCADO PAGO
        // =================================================

        console.log(
            "CREANDO PREFERENCIA DE MERCADO PAGO..."
        );

        const preferencia = {

            items: [

                {

                    id:
                        numeroAcreditacion,

                    title:
                        "Acreditación WOLF SHOWCARS 2027",

                    description:
                        "Ingreso de vehículo + " +
                        acompanantes +
                        " acompañante(s)",

                    quantity: 1,

                    currency_id: "ARS",

                    unit_price: total

                }

            ],

            external_reference:
                numeroAcreditacion,

            back_urls: {

                success:
                    URL_SITIO +
                    "/pago-exitoso.html",

                failure:
                    URL_SITIO +
                    "/?pago=fallido",

                pending:
                    URL_SITIO +
                    "/?pago=pendiente"

            },

            auto_return:
                "approved",

            notification_url:
                URL_SITIO +
                "/api/mercadopago/webhook"

        };

        const respuestaMercadoPago =
            await fetch(
                "https://api.mercadopago.com/checkout/preferences",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " +
                            MP_ACCESS_TOKEN

                    },

                    body:
                        JSON.stringify(
                            preferencia
                        )

                }
            );

        const resultadoMercadoPago =
            await respuestaMercadoPago.json();

        // =================================================
        // ERROR MERCADO PAGO
        // =================================================

        if (!respuestaMercadoPago.ok) {

            console.error(
                "ERROR MERCADO PAGO:"
            );

            console.error(
                resultadoMercadoPago
            );

            return res.status(500).json({

                ok: false,

                mensaje:
                    "La acreditación fue creada, pero no se pudo generar el pago de Mercado Pago.",

                error:
                    resultadoMercadoPago

            });

        }

        // =================================================
        // DATOS DE MERCADO PAGO
        // =================================================

        const preferenceId =
            resultadoMercadoPago.id;

        const initPoint =
            resultadoMercadoPago.init_point;

        const sandboxInitPoint =
            resultadoMercadoPago.sandbox_init_point;

        console.log(
            "PREFERENCIA MERCADO PAGO:"
        );

        console.log(
            preferenceId
        );

        // =================================================
        // RESPUESTA FINAL
        // =================================================

        return res.status(201).json({

            ok: true,

            mensaje:
                "Acreditación creada correctamente.",

            acreditacion: {

                id:
                    data.id,

                numeroAcreditacion:
                    numeroAcreditacion,

                codigoSeguridad:
                    codigoSeguridad,

                datos: {

                    nombre,
                    dni,
                    telefono,
                    instagram,
                    marca,
                    modelo,
                    anio,
                    patente,
                    acompanantes

                },

                precioAuto,

                precioAcompanante,

                total,

                estado:
                    "PENDIENTE_PAGO"

            },

            mercadoPago: {

                preferenceId:

                    preferenceId,

                initPoint:

                    initPoint,

                sandboxInitPoint:

                    sandboxInitPoint

            }

        });

    } catch (error) {

        console.error(
            "ERROR GENERAL DEL SERVIDOR:"
        );

        console.error(error);

        return res.status(500).json({

            ok: false,

            mensaje:
                "Ocurrió un error interno en el servidor.",

            error:
                error.message

        });

    }

}
```

);

// =====================================================
// WEBHOOK DE MERCADO PAGO
// =====================================================

app.post(
"/api/mercadopago/webhook",
async function (req, res) {

```
    try {

        console.log(
            "=========================================="
        );

        console.log(
            "WEBHOOK MERCADO PAGO"
        );

        console.log(
            JSON.stringify(
                req.body,
                null,
                2
            )
        );

        // Mercado Pago puede enviar
        // diferentes tipos de notificación.

        const tipo =
            req.body.type ||
            req.body.topic;

        let paymentId =
            null;

        if (
            tipo === "payment" &&
            req.body.data &&
            req.body.data.id
        ) {

            paymentId =
                String(
                    req.body.data.id
                );

        }

        if (
            !paymentId &&
            req.query &&
            req.query.id
        ) {

            paymentId =
                String(
                    req.query.id
                );

        }

        // =================================================
        // SI NO ES UNA NOTIFICACIÓN DE PAGO
        // =================================================

        if (!paymentId) {

            console.log(
                "Webhook recibido sin payment ID."
            );

            return res.sendStatus(200);

        }

        // =================================================
        // CONSULTAR PAGO DIRECTAMENTE A MERCADO PAGO
        // =================================================

        const respuestaPago =
            await fetch(

                "https://api.mercadopago.com/v1/payments/" +
                paymentId,

                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            "Bearer " +
                            MP_ACCESS_TOKEN

                    }

                }

            );

        const pago =
            await respuestaPago.json();

        if (!respuestaPago.ok) {

            console.error(
                "No se pudo consultar el pago:"
            );

            console.error(
                pago
            );

            return res.sendStatus(200);

        }

        console.log(
            "PAGO MERCADO PAGO:"
        );

        console.log(
            JSON.stringify(
                pago,
                null,
                2
            )
        );

        // =================================================
        // OBTENER ACREDITACIÓN
        // =================================================

        const numeroAcreditacion =
            pago.external_reference;

        if (!numeroAcreditacion) {

            console.error(
                "El pago no tiene external_reference."
            );

            return res.sendStatus(200);

        }

        // =================================================
        // ESTADO DEL PAGO
        // =================================================

        const estadoPago =
            pago.status;

        console.log(
            "ESTADO DEL PAGO:",
            estadoPago
        );

        // =================================================
        // ACTUALIZAR SUPABASE
        // =================================================

        let nuevoEstado =
            "PENDIENTE_PAGO";

        if (
            estadoPago === "approved"
        ) {

            nuevoEstado =
                "PAGADO";

        } else if (
            estadoPago === "rejected"
        ) {

            nuevoEstado =
                "PAGO_RECHAZADO";

        } else if (
            estadoPago === "cancelled"
        ) {

            nuevoEstado =
                "PAGO_CANCELADO";

        } else if (
            estadoPago === "refunded"
        ) {

            nuevoEstado =
                "DEVUELTO";

        } else if (
            estadoPago === "charged_back"
        ) {

            nuevoEstado =
                "CONTRACARGO";

        }

        const { error } =
            await supabase
                .from("acreditaciones")
                .update({

                    estado:
                        nuevoEstado,

                    mercado_pago_payment_id:
                        paymentId

                })
                .eq(
                    "numero_acreditacion",
                    numeroAcreditacion
                );

        if (error) {

            console.error(
                "ERROR ACTUALIZANDO SUPABASE:"
            );

            console.error(error);

            return res.sendStatus(200);

        }

        console.log(
            "ACREDITACIÓN ACTUALIZADA:"
        );

        console.log(
            numeroAcreditacion
        );

        console.log(
            "NUEVO ESTADO:",
            nuevoEstado
        );

        console.log(
            "=========================================="
        );

        return res.sendStatus(200);

    } catch (error) {

        console.error(
            "ERROR WEBHOOK:"
        );

        console.error(error);

        // Respondemos 200 para evitar
        // reintentos innecesarios mientras
        // diagnosticamos el problema.

        return res.sendStatus(200);

    }

}
```

);

// =====================================================
// INICIAR SERVIDOR
// =====================================================

app.listen(
PORT,
function () {

```
    console.log(
        "=========================================="
    );

    console.log(
        " WOLF SHOWCARS — SERVIDOR"
    );

    console.log(
        "=========================================="
    );

    console.log(
        "Servidor funcionando en puerto:"
    );

    console.log(PORT);

    console.log(
        "Supabase conectado."
    );

    console.log(
        "Mercado Pago:"
    );

    console.log(
        MP_ACCESS_TOKEN
            ? "CONFIGURADO"
            : "NO CONFIGURADO"
    );

    console.log(
        "Directorio raíz:"
    );

    console.log(ROOT);

    console.log(
        "=========================================="
    );

}
```

);
